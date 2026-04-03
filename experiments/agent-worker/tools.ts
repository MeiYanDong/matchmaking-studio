import type { AgentDatabase } from './db'
import {
  createFollowupTasks,
  getProfileBundle,
  saveConversationSummary,
  updateRowByProfileId,
} from './db'
import type { AgentAction } from './types'

export const AGENT_TOOL_DESCRIPTIONS = [
  {
    name: 'get_profile_bundle',
    description: '读取客户当前本地档案、择偶条件、生活方式、最近录音摘要和本次 conversation。',
  },
  {
    name: 'update_profile_fields',
    description: '更新 profiles 表中的基础事实字段，例如年龄、城市、学历、职业、收入、婚史、是否有孩子。',
  },
  {
    name: 'update_intention_fields',
    description: '更新 intentions 表中的婚恋意图、关系模式和对对方的核心要求。',
  },
  {
    name: 'update_trait_fields',
    description: '更新 trait_profiles 表中的兴趣、沟通风格、节奏、顾虑、跟进建议。',
  },
  {
    name: 'save_conversation_summary',
    description: '为当前录音写一段简短总结。',
  },
  {
    name: 'create_followup_tasks',
    description: '创建待补问问题，一问一事。',
  },
  {
    name: 'run_sql',
    description: 'POC 阶段的逃生舱，可直接执行 SQLite SQL。优先用结构化工具，确实做不到时再用它。',
  },
  {
    name: 'finish',
    description: '当你确认本次 transcript 已处理完成时调用，附上一段不超过 120 字的总结。',
  },
]

export function listAgentTools() {
  return AGENT_TOOL_DESCRIPTIONS
}

function runSql(db: AgentDatabase, sql: string, params: unknown[] = []) {
  const statement = db.prepare(sql)

  if (/^\s*select\b/i.test(sql)) {
    return statement.all(...params)
  }

  const result = statement.run(...params)
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  }
}

export function executeAgentTool(db: AgentDatabase, action: Exclude<AgentAction, { tool: 'finish' }>) {
  switch (action.tool) {
    case 'get_profile_bundle':
      return getProfileBundle(db, action.input.profileId, action.input.conversationId)

    case 'update_profile_fields':
      return updateRowByProfileId(db, 'profiles', action.input.profileId, action.input.updates)

    case 'update_intention_fields':
      return updateRowByProfileId(db, 'intentions', action.input.profileId, action.input.updates)

    case 'update_trait_fields':
      return updateRowByProfileId(db, 'trait_profiles', action.input.profileId, action.input.updates)

    case 'save_conversation_summary':
      return saveConversationSummary(db, action.input.conversationId, action.input.aiSummary)

    case 'create_followup_tasks':
      return createFollowupTasks(db, action.input)

    case 'run_sql':
      return runSql(db, action.input.sql, action.input.params)
  }
}
