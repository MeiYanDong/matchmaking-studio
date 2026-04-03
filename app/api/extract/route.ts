import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateClaudeTextDetailed } from '@/lib/ai/client'
import { toUserFacingAIErrorMessage } from '@/lib/ai/provider-errors'
import { EXTRACT_PROFILE_SYSTEM_PROMPT, buildExtractPrompt } from '@/lib/prompts/extract-profile'
import { parseExtractionContract } from '@/lib/ai/extraction-contract'
import { buildCurrentProfileSnapshot } from '@/lib/ai/snapshot'
import { applyExtractionContractToProfile } from '@/lib/ai/apply-extraction'
import { syncFollowupTask } from '@/lib/followup/tasks'
import { runMatchingForProfile } from '@/lib/matching/engine'
import { getSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { isLikelyTruncatedJsonOutput, parseJsonFromModelOutput } from '@/lib/ai/model-output'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error
    ? toUserFacingAIErrorMessage(error.message, fallback)
    : fallback
}

function getExtractionModel() {
  return process.env.CLAUDE_EXTRACTION_MODEL?.trim()
    || process.env.CLAUDE_DEFAULT_MODEL?.trim()
    || 'anthropic/claude-sonnet-4.6'
}

function getExtractionMaxTokens() {
  const raw = Number(process.env.CLAUDE_EXTRACTION_MAX_TOKENS)
  if (Number.isFinite(raw) && raw >= 512 && raw <= 4096) {
    return Math.floor(raw)
  }

  return 1536
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
    messages: [
      {
        role: 'user',
        content: input.prompt,
      },
    ],
  })

  try {
    return {
      contract: parseExtractionContract(parseJsonFromModelOutput(firstResult.text)),
      rawText: firstResult.text,
    }
  } catch (error) {
    const shouldRetry =
      isLikelyTruncatedJsonOutput(firstResult.text, error, firstResult.finishReason)

    if (!shouldRetry) {
      throw {
        cause: error,
        rawText: firstResult.text,
      }
    }

    const retryResult = await generateClaudeTextDetailed({
      model: input.model,
      maxTokens: Math.max(input.maxTokens, 2300),
      system: `${input.system}\n${EXTRACTION_RETRY_SYSTEM_SUFFIX}`.trim(),
      responseFormat: 'json_object',
      messages: [
        {
          role: 'user',
          content: input.prompt,
        },
      ],
    })

    try {
      return {
        contract: parseExtractionContract(parseJsonFromModelOutput(retryResult.text)),
        rawText: retryResult.text,
      }
    } catch (retryError) {
      throw {
        cause: retryError,
        rawText: retryResult.text,
        truncated: true,
      }
    }
  }
}

export async function POST(request: NextRequest) {
  let conversationId: string | undefined

  try {
    const payload = await request.json()
    conversationId = payload.conversationId
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }
    const targetConversationId = conversationId

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    const { data: conversation } = await withSupabaseRetry(
      () => supabase.from('conversations').select('*').eq('id', targetConversationId).eq('matchmaker_id', user.id).single(),
      { label: 'extract route conversation query' }
    )

    if (!conversation) {
      return NextResponse.json({ error: '对话记录不存在' }, { status: 404 })
    }

    if (conversation.status === 'done' && conversation.extracted_fields) {
      return NextResponse.json({
        success: true,
        status: 'done',
        reused: true,
        extracted: conversation.extracted_fields,
      })
    }

    if (!conversation.transcript?.trim()) {
      await supabase
        .from('conversations')
        .update({ status: 'failed', error_message: '转录文本为空' })
        .eq('id', targetConversationId)

      return NextResponse.json({ error: '转录文本为空' }, { status: 400 })
    }

    await supabase
      .from('conversations')
      .update({ status: 'extracting', error_message: null })
      .eq('id', targetConversationId)

    const [
      { data: profile },
      { data: intention },
      { data: traitProfile },
      { data: matchmakerRole },
    ] = await Promise.all([
      withSupabaseRetry(() => supabase.from('profiles').select('*').eq('id', conversation.profile_id).single(), { label: 'extract route profile query' }),
      withSupabaseRetry(() => supabase.from('intentions').select('*').eq('profile_id', conversation.profile_id).maybeSingle(), { label: 'extract route intention query' }),
      withSupabaseRetry(() => supabase.from('trait_profiles').select('*').eq('profile_id', conversation.profile_id).maybeSingle(), { label: 'extract route trait profile query' }),
      withSupabaseRetry(() => supabase.from('user_roles').select('display_name').eq('user_id', conversation.matchmaker_id).maybeSingle(), { label: 'extract route matchmaker role query' }),
    ])

    if (!profile) {
      throw new Error('客户档案不存在')
    }

    const currentSnapshot = buildCurrentProfileSnapshot({
      profile,
      intention,
      traitProfile,
      conversation,
    })

    const prompt = buildExtractPrompt({
      transcript: conversation.transcript,
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
      const fallbackMessage = payload?.truncated ? 'AI 返回被截断，请重试。' : 'AI 返回格式解析失败'
      await supabase
        .from('conversations')
        .update({
          status: 'failed',
          error_message: fallbackMessage,
          extraction_notes: payload?.rawText ?? null,
        })
        .eq('id', targetConversationId)

      return NextResponse.json({
        error: getErrorMessage(payload?.cause ?? error, fallbackMessage),
      }, { status: 500 })
    }

    const applyResult = await applyExtractionContractToProfile({
      supabase,
      profile,
      intention,
      traitProfile,
      conversation,
      contract: extractionContract,
    })

    await syncFollowupTask({
      supabase,
      matchmakerId: conversation.matchmaker_id,
      profileId: conversation.profile_id,
      fieldKeys: applyResult.missingCriticalFields,
      questions: applyResult.suggestedFollowupQuestions,
      rationale: `来自 ${new Date(conversation.created_at).toLocaleString('zh-CN')} 录音的 AI 缺口分析`,
    })

    if (applyResult.matchingRelevantChanged) {
      await runMatchingForProfile(conversation.profile_id)
    }

    await supabase
      .from('conversations')
      .update({
        status: 'done',
        error_message: null,
      })
      .eq('id', targetConversationId)

    return NextResponse.json({
      success: true,
      extracted: {
        ...extractionContract,
        applied_field_updates: applyResult.appliedFieldUpdates,
        review_required: applyResult.reviewRequired,
      },
    })
  } catch (error) {
    console.error('Extract error:', error)
    const errorMessage = getErrorMessage(error, '提取失败')
    if (conversationId) {
      const serviceRoleClient = createServiceRoleClient()
      await serviceRoleClient
        .from('conversations')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', conversationId)
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
