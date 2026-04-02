import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateClaudeText } from '@/lib/ai/client'
import { toUserFacingAIErrorMessage } from '@/lib/ai/provider-errors'
import { EXTRACT_PROFILE_SYSTEM_PROMPT, buildExtractPrompt } from '@/lib/prompts/extract-profile'
import { parseExtractionContract } from '@/lib/ai/extraction-contract'
import { buildCurrentProfileSnapshot } from '@/lib/ai/snapshot'
import { applyExtractionContractToProfile } from '@/lib/ai/apply-extraction'
import { syncFollowupTask } from '@/lib/followup/tasks'
import { runMatchingForProfile } from '@/lib/matching/engine'
import { getSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error
    ? toUserFacingAIErrorMessage(error.message, fallback)
    : fallback
}

function parseJsonFromModelOutput(text: string) {
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonText)
}

function getExtractionModel() {
  return process.env.CLAUDE_EXTRACTION_MODEL?.trim()
    || process.env.CLAUDE_DEFAULT_MODEL?.trim()
    || 'claude-sonnet-4-20250514'
}

function getExtractionMaxTokens() {
  const raw = Number(process.env.CLAUDE_EXTRACTION_MAX_TOKENS)
  if (Number.isFinite(raw) && raw >= 512 && raw <= 4096) {
    return Math.floor(raw)
  }

  return 1536
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

    const text = await generateClaudeText({
      model: getExtractionModel(),
      maxTokens: getExtractionMaxTokens(),
      system: EXTRACT_PROFILE_SYSTEM_PROMPT,
      responseFormat: 'json_object',
      messages: [
        {
          role: 'user',
          content: buildExtractPrompt({
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
          }),
        },
      ],
    })

    let extractionContract
    try {
      extractionContract = parseExtractionContract(parseJsonFromModelOutput(text))
    } catch (error) {
      await supabase
        .from('conversations')
        .update({
          status: 'failed',
          error_message: 'AI 返回格式解析失败',
          extraction_notes: text,
        })
        .eq('id', targetConversationId)

      return NextResponse.json({
        error: getErrorMessage(error, 'AI 返回格式解析失败'),
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
