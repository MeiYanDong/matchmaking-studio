import {
  Database,
  GenderType,
  ProfileStatus,
  EducationLevel,
  PrimaryIntent,
  RelationshipMode,
  TriState,
  MatchStatus,
  RecommendationType,
  ConversationStatus,
  ReminderType,
  ImportanceLevel,
} from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Intention = Database['public']['Tables']['intentions']['Row']
export type TraitProfile = Database['public']['Tables']['trait_profiles']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type FollowupTask = Database['public']['Tables']['followup_tasks']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']

export type ProfileWithDetail = Profile & {
  intentions: Intention | null
  trait_profile: TraitProfile | null
}

export type MatchWithProfiles = Match & {
  male_profile: Profile
  female_profile: Profile
}

export type ScoreBreakdown = {
  intent_stage: number
  city_mobility: number
  marriage_children: number
  economics: number
  lifestyle: number
  relationship_style: number
  sensitive_mode: number
  hard_conflicts: string[]
  pending_fields: string[]
  directional_notes: string[]
}

export type ScoreDimensionKey = keyof Omit<
  ScoreBreakdown,
  'hard_conflicts' | 'pending_fields' | 'directional_notes'
>

export const SCORE_DIMENSION_META = [
  { key: 'intent_stage', label: '意图与阶段', max: 15 },
  { key: 'city_mobility', label: '城市与流动', max: 10 },
  { key: 'marriage_children', label: '婚育边界', max: 15 },
  { key: 'economics', label: '经济与资源', max: 10 },
  { key: 'lifestyle', label: '生活方式', max: 15 },
  { key: 'relationship_style', label: '相处方式', max: 10 },
  { key: 'sensitive_mode', label: '敏感模式', max: 10 },
] as const

export const GENDER_LABELS: Record<GenderType, string> = {
  male: '男方',
  female: '女方',
}

export const STATUS_LABELS: Record<ProfileStatus, string> = {
  active: '活跃',
  inactive: '停用',
  matched: '已匹配',
  paused: '暂停',
}

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  high_school: '高中',
  associate: '专科',
  bachelor: '本科',
  master: '硕士',
  phd: '博士',
  other: '其他',
}

export const INTENT_LABELS: Record<PrimaryIntent, string> = {
  marriage: '结婚',
  dating: '恋爱',
  fertility: '生育目标',
}

export const RELATIONSHIP_MODE_LABELS: Record<RelationshipMode, string> = {
  marriage_standard: '奔着结婚去的标准婚恋',
  compensated_dating: '恋爱',
  fertility_asset_arrangement: '生育资产安排型',
}

export const TRI_STATE_LABELS: Record<TriState, string> = {
  yes: '接受',
  no: '拒绝',
  unknown: '未知',
}

export const IMPORTANCE_LEVEL_LABELS: Record<ImportanceLevel, string> = {
  hard: '硬性',
  important: '重要',
  normal: '一般',
  flexible: '无所谓',
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  pending: '待处理',
  reviewing: '评估中',
  contacted_male: '已联系男方',
  contacted_female: '已联系女方',
  both_agreed: '双方同意',
  meeting_scheduled: '已安排约谈',
  met: '已见面',
  succeeded: '匹配成功',
  failed: '匹配失败',
  dismissed: '已放弃',
}

export const RECOMMENDATION_TYPE_LABELS: Record<RecommendationType, string> = {
  confirmed: '已确认候选',
  pending_confirmation: '待确认候选',
  rejected: '已排除',
}

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  pending: '待处理',
  transcribing: '转录中',
  extracting: '提取中',
  done: '已完成',
  failed: '失败',
}

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  no_followup: '跟进提醒',
  no_new_info: '信息更新提醒',
  meeting_reminder: '约谈提醒',
  pending_confirmation: '待补问提醒',
}
