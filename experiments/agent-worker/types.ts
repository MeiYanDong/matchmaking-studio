export type JsonObject = Record<string, unknown>

export type AgentAction =
  | {
      tool: 'get_profile_bundle'
      input: {
        profileId: string
        conversationId?: string
      }
      message?: string
    }
  | {
      tool: 'update_profile_fields' | 'update_intention_fields' | 'update_trait_fields'
      input: {
        profileId: string
        updates: JsonObject
      }
      message?: string
    }
  | {
      tool: 'save_conversation_summary'
      input: {
        conversationId: string
        aiSummary: string
      }
      message?: string
    }
  | {
      tool: 'create_followup_tasks'
      input: {
        profileId: string
        conversationId?: string
        tasks: Array<{
          title?: string
          question: string
          priority?: 'high' | 'medium' | 'low'
        }>
      }
      message?: string
    }
  | {
      tool: 'run_sql'
      input: {
        sql: string
        params?: unknown[]
      }
      message?: string
    }
  | {
      tool: 'finish'
      input: {
        summary: string
      }
      message?: string
    }

export type AgentRunOptions = {
  profileId: string
  conversationId: string
  model?: string
  maxSteps?: number
  dryRun?: boolean
}
