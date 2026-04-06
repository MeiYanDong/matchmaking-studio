/**
 * 端到端提取测试脚本
 * 直接用 service-role client 触发提取逻辑，绕过 HTTP 路由的 session 验证
 *
 * 用法：npx tsx scripts/test-extract.ts [conversationId]
 */

process.loadEnvFile('.env')
process.loadEnvFile('.env.local')

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { generateClaudeTextDetailed } from '../lib/ai/client'
import { EXTRACT_PROFILE_SYSTEM_PROMPT, buildExtractPrompt } from '../lib/prompts/extract-profile'
import { parseExtractionContract } from '../lib/ai/extraction-contract'
import { buildCurrentProfileSnapshot } from '../lib/ai/snapshot'
import { applyExtractionContractToProfile } from '../lib/ai/apply-extraction'
import { syncFollowupTask } from '../lib/followup/tasks'
import { runMatchingForProfile } from '../lib/matching/engine'
import { isLikelyTruncatedJsonOutput, parseJsonFromModelOutput } from '../lib/ai/model-output'

const CONVERSATION_ID = process.argv[2] || '2cffefa9-d194-49e9-9d06-845996bf3924'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function getExtractionModel() {
  return (
    process.env.CLAUDE_EXTRACTION_MODEL?.trim() ||
    process.env.CLAUDE_DEFAULT_MODEL?.trim() ||
    'anthropic/claude-sonnet-4.6'
  )
}

function getExtractionMaxTokens() {
  const raw = Number(process.env.CLAUDE_EXTRACTION_MAX_TOKENS)
  if (Number.isFinite(raw) && raw >= 512 && raw <= 4096) return Math.floor(raw)
  return 2560
}

const EXTRACTION_RETRY_SYSTEM_SUFFIX = `

补充规则：
1. 你上一次输出可能因为过长被截断，这一次请进一步压缩。
2. processing_notes 最多 3 条，每条不超过 24 个字。
3. summary_updates 文本字段尽量一句话。
4. 除必要字段外，不要生成冗长原因说明。
`

async function generateAndParseExtractionContract(input: {
  model: string
  maxTokens: number
  system: string
  prompt: string
}) {
  const firstResult = await generateClaudeTextDetailed({
    model: input.model,
    maxTokens: input.maxTokens,
    system: input.system,
    responseFormat: 'json_object',
    messages: [{ role: 'user', content: input.prompt }],
  })

  console.log(`[AI] finish_reason=${firstResult.finishReason} provider=${firstResult.provider}`)
  console.log(`[AI] 输出长度: ${firstResult.text.length} 字符`)

  try {
    return {
      contract: parseExtractionContract(parseJsonFromModelOutput(firstResult.text)),
      rawText: firstResult.text,
    }
  } catch (error) {
    const shouldRetry = isLikelyTruncatedJsonOutput(firstResult.text, error, firstResult.finishReason)
    console.warn(`[AI] 首次解析失败，shouldRetry=${shouldRetry}`, error)

    if (!shouldRetry) throw { cause: error, rawText: firstResult.text }

    console.log('[AI] 触发重试（输出可能被截断）...')
    const retryResult = await generateClaudeTextDetailed({
      model: input.model,
      maxTokens: Math.max(input.maxTokens, 2300),
      system: `${input.system}\n${EXTRACTION_RETRY_SYSTEM_SUFFIX}`.trim(),
      responseFormat: 'json_object',
      messages: [{ role: 'user', content: input.prompt }],
    })

    console.log(`[AI] 重试 finish_reason=${retryResult.finishReason}`)
    return {
      contract: parseExtractionContract(parseJsonFromModelOutput(retryResult.text)),
      rawText: retryResult.text,
    }
  }
}

async function main() {
  console.log(`\n=== 提取测试 ===`)
  console.log(`conversationId: ${CONVERSATION_ID}`)
  console.log(`model: ${getExtractionModel()}`)
  console.log(`maxTokens: ${getExtractionMaxTokens()}`)
  console.log()

  // 1. 加载 conversation
  const { data: conversation, error: convErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', CONVERSATION_ID)
    .single()

  if (convErr || !conversation) {
    throw new Error(`找不到 conversation: ${convErr?.message}`)
  }

  console.log(`[DB] conversation status=${conversation.status} profile_id=${conversation.profile_id}`)

  const transcript = conversation.transcript?.trim() ?? ''
  if (!transcript) throw new Error('transcript 为空')
  console.log(`[DB] transcript 长度: ${transcript.length} 字符`)

  // 2. 加载相关数据
  const [
    { data: profile },
    { data: intention },
    { data: traitProfile },
    { data: matchmakerRole },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', conversation.profile_id).single(),
    supabase.from('intentions').select('*').eq('profile_id', conversation.profile_id).maybeSingle(),
    supabase.from('trait_profiles').select('*').eq('profile_id', conversation.profile_id).maybeSingle(),
    supabase.from('user_roles').select('display_name').eq('user_id', conversation.matchmaker_id).maybeSingle(),
  ])

  if (!profile) throw new Error('profile 不存在')
  console.log(`[DB] profile name=${profile.name} gender=${profile.gender}`)

  // 3. 更新状态为 extracting
  await supabase
    .from('conversations')
    .update({ status: 'extracting', failed_stage: null, error_message: null })
    .eq('id', CONVERSATION_ID)
  console.log('[DB] 状态 -> extracting')

  // 4. 构建 snapshot 和 prompt
  const currentSnapshot = buildCurrentProfileSnapshot({ profile, intention, traitProfile, conversation })
  const prompt = buildExtractPrompt({
    transcript,
    transcriptVerboseJson: conversation.transcript_verbose_json,
    currentSnapshot,
    systemContext: {
      matchmaker_id: conversation.matchmaker_id,
      matchmaker_name: matchmakerRole?.display_name ?? null,
      profile_id: profile.id,
      profile_gender: profile.gender,
      conversation_id: conversation.id,
      uploaded_at: conversation.created_at,
      audio_duration: conversation.audio_duration,
    },
  })

  console.log(`[PROMPT] prompt 长度: ${prompt.length} 字符`)
  console.log()

  // 5. 调用 AI
  console.log('[AI] 开始提取...')
  let extractionContract
  let rawModelText = ''

  try {
    const result = await generateAndParseExtractionContract({
      model: getExtractionModel(),
      maxTokens: getExtractionMaxTokens(),
      system: EXTRACT_PROFILE_SYSTEM_PROMPT,
      prompt,
    })
    extractionContract = result.contract
    rawModelText = result.rawText
  } catch (error) {
    const payload = error as { cause?: unknown; rawText?: string; truncated?: boolean }
    console.error('[AI] 提取失败:', payload?.cause ?? error)
    if (payload?.rawText) {
      console.error('[AI] rawText (前 500 字):', payload.rawText.slice(0, 500))
    }

    await supabase
      .from('conversations')
      .update({
        status: 'failed',
        failed_stage: 'extract',
        error_message: 'AI 返回格式解析失败',
        extraction_notes: payload?.rawText ?? null,
      })
      .eq('id', CONVERSATION_ID)

    process.exit(1)
  }

  console.log()
  console.log('[RESULT] field_updates:', extractionContract.field_updates.length, '条')
  console.log('[RESULT] review_required:', extractionContract.review_required.length, '条')
  console.log('[RESULT] missing_critical_fields:', extractionContract.missing_critical_fields)
  console.log('[RESULT] processing_notes:', extractionContract.processing_notes)
  console.log()

  // 6. 写入数据库
  console.log('[DB] 开始写入...')
  const applyResult = await applyExtractionContractToProfile({
    supabase,
    profile,
    intention,
    traitProfile,
    conversation,
    contract: extractionContract,
    finalStatus: 'done',
  })

  console.log('[DB] 写入完成')
  console.log('[DB] appliedFieldUpdates:', applyResult.appliedFieldUpdates.length, '条')
  console.log('[DB] reviewRequired:', applyResult.reviewRequired.length, '条')
  console.log('[DB] matchingRelevantChanged:', applyResult.matchingRelevantChanged)
  console.log()

  // 7. 同步 followup 任务
  await syncFollowupTask({
    supabase,
    matchmakerId: conversation.matchmaker_id,
    profileId: conversation.profile_id,
    fieldKeys: applyResult.missingCriticalFields,
    questions: applyResult.suggestedFollowupQuestions,
    rationale: `来自 ${new Date(conversation.created_at).toLocaleString('zh-CN')} 录音的 AI 缺口分析`,
  })
  console.log('[FOLLOWUP] 同步完成')

  // 8. 如有必要运行匹配
  if (applyResult.matchingRelevantChanged) {
    console.log('[MATCHING] 触发匹配更新...')
    await runMatchingForProfile(conversation.profile_id)
    console.log('[MATCHING] 完成')
  }

  // 9. 打印写入字段详情
  console.log('\n=== 写入字段详情 ===')
  for (const update of applyResult.appliedFieldUpdates) {
    console.log(`  ${update.field_label ?? update.field_key}: ${JSON.stringify(update.old_value)} → ${JSON.stringify(update.new_value)}  [${update.confidence}]`)
  }

  if (applyResult.reviewRequired.length) {
    console.log('\n=== 待人工确认 ===')
    for (const item of applyResult.reviewRequired) {
      console.log(`  ${item.field_label ?? item.field_key}: ${JSON.stringify(item.candidate_value)}  [${item.issue_type}]`)
    }
  }

  console.log('\n✅ 提取测试完成')
}

main().catch((err) => {
  console.error('\n❌ 脚本执行失败:', err)
  process.exit(1)
})
