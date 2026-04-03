import { generateClaudeTextDetailed } from '@/lib/ai/client'
import { parseJsonFromModelOutput } from '@/lib/ai/model-output'
import {
  createAgentRun,
  getProfileBundle,
  insertAgentRunEvent,
  openAgentDatabase,
  updateAgentRun,
  type AgentDatabase,
} from './db'
import { buildAgentSystemPrompt, buildAgentTaskPrompt } from './prompt'
import { executeAgentTool } from './tools'
import type { AgentAction, AgentRunOptions } from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeAgentAction(payload: unknown): AgentAction {
  if (!isObject(payload) || typeof payload.tool !== 'string' || !isObject(payload.input)) {
    throw new Error('Agent 返回的动作格式不合法。')
  }

  return payload as AgentAction
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeObject(value: unknown) {
  return isObject(value) ? value : {}
}

function hydrateActionDefaults(action: AgentAction, profileId: string, conversationId: string): AgentAction {
  switch (action.tool) {
    case 'get_profile_bundle':
      return {
        ...action,
        input: {
          profileId: normalizeString(action.input.profileId, profileId),
          conversationId: normalizeString(action.input.conversationId, conversationId),
        },
      }

    case 'update_profile_fields':
    case 'update_intention_fields':
    case 'update_trait_fields':
      return {
        ...action,
        input: {
          profileId: normalizeString(action.input.profileId, profileId),
          updates: normalizeObject(action.input.updates),
        },
      }

    case 'save_conversation_summary':
      return {
        ...action,
        input: {
          conversationId: normalizeString(action.input.conversationId, conversationId),
          aiSummary: normalizeString(action.input.aiSummary, ''),
        },
      }

    case 'create_followup_tasks':
      return {
        ...action,
        input: {
          profileId: normalizeString(action.input.profileId, profileId),
          conversationId: normalizeString(action.input.conversationId, conversationId),
          tasks: Array.isArray(action.input.tasks) ? action.input.tasks : [],
        },
      }

    case 'run_sql':
      return {
        ...action,
        input: {
          sql: normalizeString(action.input.sql, ''),
          params: Array.isArray(action.input.params) ? action.input.params : [],
        },
      }

    case 'finish':
      return {
        ...action,
        input: {
          summary: normalizeString(action.input.summary, 'Agent 已完成本次 transcript 处理。'),
        },
      }
  }
}

type RunAgentExtractionResult = {
  runId: string
  steps: number
  finalSummary: string
  actions: AgentAction[]
}

function validateActionForPoc(action: AgentAction) {
  switch (action.tool) {
    case 'update_profile_fields':
    case 'update_intention_fields':
    case 'update_trait_fields':
      if (Object.keys(action.input.updates).length === 0) {
        return {
          ok: false,
          error: 'empty_updates_not_allowed',
          guidance: 'updates 不能为空；如果没有可写字段，请改用其他工具或 finish。',
        }
      }
      return null

    case 'save_conversation_summary':
      if (!action.input.aiSummary.trim()) {
        return {
          ok: false,
          error: 'empty_summary_not_allowed',
          guidance: 'aiSummary 不能为空。',
        }
      }
      return null

    case 'create_followup_tasks':
      if (action.input.tasks.length === 0) {
        return {
          ok: false,
          error: 'empty_tasks_not_allowed',
          guidance: 'tasks 不能为空；如果没有补问，请直接 finish。',
        }
      }
      return null

    case 'run_sql':
      if (!action.input.sql.trim()) {
        return {
          ok: false,
          error: 'empty_sql_not_allowed',
          guidance: 'run_sql 需要提供 sql。',
        }
      }
      return null

    default:
      return null
  }
}

async function requestNextAction(params: {
  profileId: string
  conversationId: string
  transcript: string
  snapshot: unknown
  stepIndex: number
  stepLog: Array<{ step: number; tool: string; result: unknown }>
  model: string
}) {
  const result = await generateClaudeTextDetailed({
    model: params.model,
    maxTokens: 1200,
    system: buildAgentSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildAgentTaskPrompt({
          profileId: params.profileId,
          conversationId: params.conversationId,
          transcript: params.transcript,
          snapshot: params.snapshot,
          stepIndex: params.stepIndex,
          stepLog: params.stepLog,
        }),
      },
    ],
    responseFormat: 'json_object',
  })

  return hydrateActionDefaults(
    normalizeAgentAction(parseJsonFromModelOutput(result.text)),
    params.profileId,
    params.conversationId
  )
}

function readTranscript(db: AgentDatabase, conversationId: string) {
  const row = db.prepare('SELECT transcript FROM conversations WHERE id = ?').get(conversationId) as { transcript?: string } | undefined
  if (!row?.transcript) {
    throw new Error(`未找到 conversation ${conversationId} 的 transcript。`)
  }
  return row.transcript
}

export async function runAgentExtraction(options: AgentRunOptions): Promise<RunAgentExtractionResult> {
  const db = openAgentDatabase()
  const transcript = readTranscript(db, options.conversationId)
  const model = options.model || process.env.AGENT_POC_MODEL || 'anthropic/claude-sonnet-4.6'
  const maxSteps = options.maxSteps || 8
  const dryRun = options.dryRun ?? false

  const runId = createAgentRun(db, {
    profileId: options.profileId,
    conversationId: options.conversationId,
    mode: dryRun ? 'dry-run' : 'real-run',
    status: 'running',
  })

  const actions: AgentAction[] = []
  const stepLog: Array<{ step: number; tool: string; result: unknown }> = []
  let finalSummary = ''

  try {
    for (let step = 1; step <= maxSteps; step += 1) {
      const snapshot = getProfileBundle(db, options.profileId, options.conversationId)
      const action = await requestNextAction({
        profileId: options.profileId,
        conversationId: options.conversationId,
        transcript,
        snapshot,
        stepIndex: step,
        stepLog,
        model,
      })

      actions.push(action)

      if (action.tool === 'finish') {
        finalSummary = action.input.summary
        insertAgentRunEvent(db, {
          runId,
          stepIndex: step,
          toolName: 'finish',
          toolInput: action.input,
          toolResult: { ok: true, finalSummary },
        })
        updateAgentRun(db, runId, {
          status: 'completed',
          finalSummary,
          stepCount: step,
        })
        return {
          runId,
          steps: step,
          finalSummary,
          actions,
        }
      }

      const validationError = validateActionForPoc(action)
      const toolResult = validationError
        ? validationError
        : dryRun
          ? { dryRun: true, preview: action.input }
          : executeAgentTool(db, action)

      insertAgentRunEvent(db, {
        runId,
        stepIndex: step,
        toolName: action.tool,
        toolInput: action.input,
        toolResult,
      })

      stepLog.push({
        step,
        tool: action.tool,
        result: toolResult,
      })
    }

    finalSummary = '达到最大步数，Agent 未主动 finish。'
    updateAgentRun(db, runId, {
      status: 'max-steps-reached',
      finalSummary,
      stepCount: maxSteps,
    })

    return {
      runId,
      steps: maxSteps,
      finalSummary,
      actions,
    }
  } catch (error) {
    finalSummary = error instanceof Error ? error.message : '未知错误'
    updateAgentRun(db, runId, {
      status: 'failed',
      finalSummary,
      stepCount: actions.length,
    })
    throw error
  } finally {
    db.close()
  }
}
