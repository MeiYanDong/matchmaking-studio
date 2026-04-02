import { createClient } from '@supabase/supabase-js'
import { calculateMatchScore, type ProfileWithIntention } from '../lib/matching/score'
import { syncFollowupTask } from '../lib/followup/tasks'
import type {
  ConversationInsert,
  Database,
  FollowupTaskInsert,
  GenderType,
  Intention,
  IntentionInsert,
  MatchInsert,
  MatchStatus,
  Profile,
  ProfileInsert,
  ReminderInsert,
  TraitProfile,
  TraitProfileInsert,
} from '../types/database'

process.loadEnvFile('.env')
process.loadEnvFile('.env.local')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const SEED_PREFIX = '本地测试-'
const LEGACY_PREFIX = '流程测试-'
const DEMO_MATCHMAKER_EMAIL = 'matchmaker-demo@marry.local'

type SeedConversation = {
  transcript: string
  createdAt: string
  talkedAt?: string
  audioDuration?: number
  missingFields?: string[]
  suggestedQuestions?: string[]
  processingNotes?: string[]
}

type SeedPerson = {
  key: string
  gender: GenderType
  profile: Omit<ProfileInsert, 'matchmaker_id' | 'gender' | 'status' | 'name'>
  intention: Omit<IntentionInsert, 'profile_id'>
  trait: Omit<TraitProfileInsert, 'profile_id'>
  conversations: SeedConversation[]
}

type SeededPerson = {
  seed: SeedPerson
  profile: Profile
  intention: Intention | null
  traitProfile: TraitProfile | null
}

function daysAgo(days: number, hour = 10) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

function hoursFromNow(hours: number) {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date.toISOString()
}

function buildConversationInsert(
  matchmakerId: string,
  profileId: string,
  seedKey: string,
  conversation: SeedConversation,
  index: number
): ConversationInsert {
  const missingFields = conversation.missingFields ?? []
  const suggestedQuestions = conversation.suggestedQuestions ?? []

  return {
    profile_id: profileId,
    matchmaker_id: matchmakerId,
    audio_url: `seed/local-demo/${seedKey}-${index + 1}.mp3`,
    audio_duration: conversation.audioDuration ?? 90,
    talked_at: conversation.talkedAt ?? conversation.createdAt,
    transcript: conversation.transcript,
    transcript_verbose_json: {
      source: 'local-demo-seed',
      seed_key: seedKey,
      segment_count: 1,
    },
    extracted_fields: {
      field_updates: [],
      applied_field_updates: [],
      review_required: [],
      missing_critical_fields: missingFields,
      suggested_followup_questions: suggestedQuestions,
      summary_updates: {},
      processing_notes: conversation.processingNotes ?? ['本地测试数据：手工构造的演示会话'],
    },
    extraction_notes: '本地测试数据：已直接写入结构化结果',
    missing_fields: missingFields,
    suggested_questions: suggestedQuestions,
    reviewed_by: matchmakerId,
    reviewed_at: conversation.createdAt,
    status: 'done',
    error_message: null,
    created_at: conversation.createdAt,
  }
}

function buildConfirmedReason(male: Profile, female: Profile, score: number) {
  return `${male.name} 与 ${female.name} 同城且关系目标清晰，核心边界相容，当前 ${score} 分已达到可直接推进的确认候选。`
}

function reminderMessage(leadQuestion?: string, fallback?: string) {
  if (leadQuestion) {
    return `有待确认字段尚未补问：${leadQuestion}`
  }
  return fallback || '有待确认字段需要继续线下补问，请及时处理。'
}

async function resolveDemoMatchmaker() {
  const { data: usersData, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) throw userError

  const demoUser = usersData.users.find((user) => user.email === DEMO_MATCHMAKER_EMAIL)
  if (!demoUser) {
    throw new Error(`未找到 ${DEMO_MATCHMAKER_EMAIL}，请先创建红娘测试账号`)
  }

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('user_id, display_name, role')
    .eq('user_id', demoUser.id)
    .eq('role', 'matchmaker')
    .maybeSingle()

  if (roleError) throw roleError
  if (!roleRow) {
    throw new Error(`账号 ${DEMO_MATCHMAKER_EMAIL} 还没有 matchmaker 角色`)
  }

  return {
    id: demoUser.id,
    displayName: roleRow.display_name,
  }
}

async function cleanupPreviousSeed(matchmakerId: string) {
  const { data: existingProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('matchmaker_id', matchmakerId)

  if (profileError) throw profileError

  const seededProfiles = (existingProfiles ?? []).filter((profile) =>
    profile.name.startsWith(SEED_PREFIX) || profile.name.startsWith(LEGACY_PREFIX)
  )

  if (!seededProfiles.length) {
    return { removedProfiles: 0, removedMatches: 0 }
  }

  const profileIds = seededProfiles.map((profile) => profile.id)

  const { data: existingMatches, error: matchFetchError } = await supabase
    .from('matches')
    .select('id')
    .or(`male_profile_id.in.(${profileIds.join(',')}),female_profile_id.in.(${profileIds.join(',')})`)

  if (matchFetchError) throw matchFetchError

  const matchIds = (existingMatches ?? []).map((match) => match.id)

  const { data: conversations, error: conversationFetchError } = await supabase
    .from('conversations')
    .select('audio_url')
    .in('profile_id', profileIds)

  if (conversationFetchError) throw conversationFetchError

  const audioPaths = (conversations ?? []).map((row) => row.audio_url).filter(Boolean) as string[]

  if (matchIds.length) {
    await supabase.from('reminders').delete().in('match_id', matchIds)
    await supabase.from('followup_tasks').delete().in('match_id', matchIds)
    await supabase.from('matches').delete().in('id', matchIds)
  }

  await supabase.from('reminders').delete().in('profile_id', profileIds)
  await supabase.from('followup_tasks').delete().in('profile_id', profileIds)
  await supabase.from('conversations').delete().in('profile_id', profileIds)
  await supabase.from('trait_profiles').delete().in('profile_id', profileIds)
  await supabase.from('intentions').delete().in('profile_id', profileIds)
  await supabase.from('profiles').delete().in('id', profileIds)

  if (audioPaths.length) {
    await supabase.storage.from('audio-files').remove(audioPaths)
  }

  return {
    removedProfiles: profileIds.length,
    removedMatches: matchIds.length,
  }
}

async function insertSeedPerson(matchmakerId: string, seed: SeedPerson): Promise<SeededPerson> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      matchmaker_id: matchmakerId,
      gender: seed.gender,
      status: 'active',
      name: `${SEED_PREFIX}${seed.key}`,
      raw_notes: `local-demo-seed:${seed.key}`,
      ...seed.profile,
    })
    .select('*')
    .single()

  if (profileError || !profile) {
    throw new Error(profileError?.message || `创建档案失败: ${seed.key}`)
  }

  const intentionPayload: IntentionInsert = {
    profile_id: profile.id,
    ...seed.intention,
  }

  const traitPayload: TraitProfileInsert = {
    profile_id: profile.id,
    ...seed.trait,
  }

  const [{ error: intentionError }, { error: traitError }] = await Promise.all([
    supabase.from('intentions').upsert(intentionPayload, { onConflict: 'profile_id' }),
    supabase.from('trait_profiles').upsert(traitPayload, { onConflict: 'profile_id' }),
  ])

  if (intentionError) throw intentionError
  if (traitError) throw traitError

  const conversations = seed.conversations.map((conversation, index) =>
    buildConversationInsert(matchmakerId, profile.id, seed.key, conversation, index)
  )

  const { error: conversationError } = await supabase.from('conversations').insert(conversations)
  if (conversationError) throw conversationError

  const [{ data: intention }, { data: traitProfile }] = await Promise.all([
    supabase.from('intentions').select('*').eq('profile_id', profile.id).maybeSingle(),
    supabase.from('trait_profiles').select('*').eq('profile_id', profile.id).maybeSingle(),
  ])

  return {
    seed,
    profile,
    intention,
    traitProfile,
  }
}

function toProfileWithIntention(person: SeededPerson): ProfileWithIntention {
  return {
    ...person.profile,
    intention: person.intention,
    traitProfile: person.traitProfile,
  }
}

async function insertMatch(
  matchmakerId: string,
  male: SeededPerson,
  female: SeededPerson,
  status: MatchStatus
) {
  const maleProfile = toProfileWithIntention(male)
  const femaleProfile = toProfileWithIntention(female)
  const evaluation = calculateMatchScore(maleProfile, femaleProfile)

  if (!evaluation.qualifies) {
    return null
  }

  const payload: MatchInsert = {
    male_profile_id: male.profile.id,
    female_profile_id: female.profile.id,
    matchmaker_id: matchmakerId,
    match_score: evaluation.total,
    score_breakdown: evaluation.breakdown,
    match_reason:
      evaluation.recommendationType === 'confirmed'
        ? buildConfirmedReason(male.profile, female.profile, evaluation.total)
        : evaluation.pendingReasons[0] ?? evaluation.breakdown.directional_notes[0] ?? '',
    recommendation_type: evaluation.recommendationType,
    pending_reasons: evaluation.pendingReasons,
    required_followup_fields: evaluation.requiredFollowupFields,
    suggested_followup_questions: evaluation.suggestedFollowupQuestions,
    status,
    meeting_time: status === 'meeting_scheduled' ? hoursFromNow(20) : null,
    meeting_location: status === 'meeting_scheduled' ? '静安嘉里中心咖啡厅' : null,
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert(payload)
    .select('*')
    .single()

  if (matchError || !match) {
    throw new Error(matchError?.message || `创建匹配失败: ${male.profile.name} -> ${female.profile.name}`)
  }

  if (evaluation.recommendationType === 'pending_confirmation') {
    await syncFollowupTask({
      supabase,
      matchmakerId,
      profileId: female.profile.id,
      matchId: match.id,
      fieldKeys: evaluation.requiredFollowupFields,
      questions: evaluation.suggestedFollowupQuestions,
      rationale: '本地测试数据：高分候选仍存在待确认敏感字段，需要线下补问',
      taskType: 'relationship_followup',
    })

    const reminder: ReminderInsert = {
      matchmaker_id: matchmakerId,
      profile_id: female.profile.id,
      match_id: match.id,
      type: 'pending_confirmation',
      message: reminderMessage(
        evaluation.suggestedFollowupQuestions[0],
        '本地测试数据：有待确认字段需要继续线下补问。'
      ),
      is_read: false,
    }

    await supabase.from('reminders').insert(reminder)
  }

  return {
    match,
    evaluation,
  }
}

const seedPeople: SeedPerson[] = [
  {
    key: '顾承泽',
    gender: 'male',
    profile: {
      age: 36,
      city: '上海',
      current_base_cities: ['上海'],
      education: 'master',
      occupation: '投资合伙人',
      annual_income: 520,
      marital_history: '未婚',
      has_children: false,
      hobbies: ['徒步', '展览', '旅行'],
      ai_summary: '上海投资合伙人，36岁，奔着结婚去，节奏稳定。',
      followup_strategy: '可直接推进正式约见，重点观察生活节奏与婚育计划是否一致。',
    },
    intention: {
      primary_intent: 'marriage',
      relationship_mode: 'marriage_standard',
      accepts_mode_marriage_standard: 'yes',
      accepts_mode_compensated_dating: 'no',
      accepts_mode_fertility_asset_arrangement: 'no',
      preferred_age_min: 27,
      preferred_age_max: 33,
      preferred_cities: ['上海'],
      preferred_education: ['bachelor', 'master', 'phd'],
      preferred_income_min: 80,
      accepts_long_distance: 'no',
      relocation_willingness: 'no',
      fertility_preference: '希望婚后两年内要孩子',
      accepts_partner_marital_history: ['未婚'],
      accepts_partner_children: 'yes',
      relationship_pace: '稳定推进',
      communication_style: '直接坦诚',
      preference_importance: { city: 'hard', income: 'important' },
    },
    trait: {
      sleep_schedule: '早睡早起',
      social_preference: '平衡',
      emotional_stability: '稳定',
      exercise_habits: '每周徒步和健身',
      spending_style: '理性但愿意为体验买单',
    },
    conversations: [
      {
        transcript: '我36岁，在上海做投资，硕士，年收入大概520万，没结过婚，也没有孩子。现在就是奔着结婚去的，希望对方也在上海发展，最好两年内有结婚和要孩子计划。平时喜欢徒步、展览和旅行。',
        createdAt: daysAgo(8, 19),
        missingFields: [],
        suggestedQuestions: [],
      },
    ],
  },
  {
    key: '苏晚晴',
    gender: 'female',
    profile: {
      age: 30,
      city: '上海',
      current_base_cities: ['上海'],
      education: 'master',
      occupation: '品牌总监',
      annual_income: 120,
      marital_history: '未婚',
      has_children: false,
      hobbies: ['展览', '跑步', '旅行'],
      ai_summary: '上海品牌总监，30岁，明确奔着结婚去，偏好稳定长期关系。',
      followup_strategy: '已具备正式约见条件，可先安排轻松线下见面。',
    },
    intention: {
      primary_intent: 'marriage',
      relationship_mode: null,
      accepts_mode_marriage_standard: 'yes',
      accepts_mode_compensated_dating: 'no',
      accepts_mode_fertility_asset_arrangement: 'no',
      preferred_age_min: 32,
      preferred_age_max: 40,
      preferred_cities: ['上海'],
      preferred_education: ['bachelor', 'master', 'phd'],
      preferred_income_min: 100,
      accepts_long_distance: 'no',
      relocation_willingness: 'no',
      fertility_preference: '希望婚后两年内要孩子',
      accepts_partner_marital_history: ['未婚'],
      accepts_partner_children: 'yes',
      relationship_pace: '稳定推进',
      communication_style: '直接坦诚',
      preference_importance: { city: 'hard', income: 'important' },
    },
    trait: {
      sleep_schedule: '早睡早起',
      social_preference: '平衡',
      emotional_stability: '稳定',
      exercise_habits: '每周跑步',
      spending_style: '理性',
    },
    conversations: [
      {
        transcript: '我30岁，现在在上海做品牌总监，硕士，年收入120万，未婚，没有孩子。我的目标就是认真结婚，也希望对方在上海长期发展，情绪稳定，沟通直接一些。我平时喜欢展览、跑步和旅行，希望婚后两年内考虑孩子。',
        createdAt: daysAgo(7, 20),
      },
    ],
  },
  {
    key: '周砚之',
    gender: 'male',
    profile: {
      age: 34,
      city: '上海',
      current_base_cities: ['上海'],
      education: 'bachelor',
      occupation: '消费品牌创始人',
      annual_income: 860,
      marital_history: '未婚',
      has_children: false,
      hobbies: ['旅行', '摄影', '美食'],
      ai_summary: '上海消费品牌创始人，34岁，倾向恋爱关系并接受清晰经济安排。',
      followup_strategy: '优先看女方是否接受清晰经济支持安排，其次再聊孩子与长期规划。',
    },
    intention: {
      primary_intent: 'dating',
      relationship_mode: 'compensated_dating',
      accepts_mode_marriage_standard: 'yes',
      accepts_mode_compensated_dating: 'yes',
      accepts_mode_fertility_asset_arrangement: 'no',
      preferred_age_min: 24,
      preferred_age_max: 34,
      preferred_cities: ['上海'],
      preferred_education: ['bachelor', 'master', 'phd'],
      preferred_income_min: 50,
      accepts_long_distance: 'no',
      relocation_willingness: 'no',
      fertility_preference: '暂不考虑孩子',
      accepts_partner_marital_history: ['未婚', '离异'],
      accepts_partner_children: 'yes',
      relationship_pace: '先建立稳定相处',
      communication_style: '坦诚直接',
      preference_importance: { city: 'hard', income: 'flexible' },
    },
    trait: {
      sleep_schedule: '晚睡但规律',
      social_preference: '偏外向',
      emotional_stability: '稳定',
      exercise_habits: '每周健身两次',
      spending_style: '体验导向',
    },
    conversations: [
      {
        transcript: '我34岁，在上海做消费品牌，年收入八百多万。现在更想找恋爱关系，如果相处稳定，我愿意给女生明确的经济支持安排，但希望边界说清楚。我未婚，没有孩子，也能接受对方有孩子。',
        createdAt: daysAgo(6, 18),
      },
    ],
  },
  {
    key: '林知夏',
    gender: 'female',
    profile: {
      age: 28,
      city: '上海',
      current_base_cities: ['上海'],
      education: 'bachelor',
      occupation: '策展人',
      annual_income: 85,
      marital_history: '未婚',
      has_children: false,
      hobbies: ['展览', '旅行', '咖啡'],
      ai_summary: '上海策展人，28岁，先看相处质量，对经济安排边界还需补问。',
      followup_strategy: '先补问是否接受明确经济支持安排，再决定是否推进给周砚之。',
    },
    intention: {
      primary_intent: 'dating',
      relationship_mode: null,
      accepts_mode_marriage_standard: 'yes',
      accepts_mode_compensated_dating: 'unknown',
      accepts_mode_fertility_asset_arrangement: 'no',
      preferred_age_min: 30,
      preferred_age_max: 38,
      preferred_cities: ['上海'],
      preferred_education: ['bachelor', 'master', 'phd'],
      preferred_income_min: 80,
      accepts_long_distance: 'no',
      relocation_willingness: 'no',
      fertility_preference: '以后再看',
      accepts_partner_marital_history: ['未婚', '离异'],
      accepts_partner_children: 'unknown',
      relationship_pace: '先多了解再推进',
      communication_style: '温和直接',
      preference_importance: { city: 'hard', income: 'important' },
    },
    trait: {
      sleep_schedule: '规律',
      social_preference: '平衡',
      emotional_stability: '稳定',
      exercise_habits: '瑜伽',
      spending_style: '理性',
    },
    conversations: [
      {
        transcript: '我28岁，在上海做策展，本科，年收入八十多万。现在想先谈恋爱，城市最好还是上海。我比较看重情绪稳定和相处舒服，至于经济安排这种事还得具体看人和边界。',
        createdAt: daysAgo(5, 19),
        missingFields: ['accepts_mode_compensated_dating', 'accepts_partner_children'],
        suggestedQuestions: [
          '如果对方是带明确经济支持安排的恋爱关系，你能接受吗？',
          '如果对方有孩子，你这边能接受吗？',
        ],
      },
    ],
  },
  {
    key: '许清嘉',
    gender: 'female',
    profile: {
      age: 32,
      city: '上海',
      current_base_cities: ['上海'],
      education: 'master',
      occupation: '艺术经纪人',
      annual_income: 150,
      marital_history: '未婚',
      has_children: false,
      hobbies: ['旅行', '摄影', '餐酒'],
      ai_summary: '上海艺术经纪人，32岁，明确接受边界清晰的经济安排型恋爱。',
      followup_strategy: '可直接作为周砚之的确认候选推进。',
    },
    intention: {
      primary_intent: 'dating',
      relationship_mode: null,
      accepts_mode_marriage_standard: 'yes',
      accepts_mode_compensated_dating: 'yes',
      accepts_mode_fertility_asset_arrangement: 'no',
      preferred_age_min: 32,
      preferred_age_max: 40,
      preferred_cities: ['上海'],
      preferred_education: ['bachelor', 'master', 'phd'],
      preferred_income_min: 100,
      accepts_long_distance: 'no',
      relocation_willingness: 'no',
      fertility_preference: '暂不着急',
      accepts_partner_marital_history: ['未婚', '离异'],
      accepts_partner_children: 'yes',
      relationship_pace: '先建立稳定相处',
      communication_style: '坦诚直接',
      preference_importance: { city: 'hard', income: 'important' },
    },
    trait: {
      sleep_schedule: '规律',
      social_preference: '偏外向',
      emotional_stability: '稳定',
      exercise_habits: '普拉提',
      spending_style: '体验导向',
    },
    conversations: [
      {
        transcript: '我32岁，在上海做艺术经纪，硕士，年收入一百五十万。对关系模式我很清楚，如果是认真恋爱，且双方边界清楚、经济安排透明，我可以接受。我不接受以生育为核心的安排。',
        createdAt: daysAgo(4, 20),
      },
    ],
  },
  {
    key: '秦景川',
    gender: 'male',
    profile: {
      age: 41,
      city: '新加坡',
      current_base_cities: ['新加坡', '上海'],
      education: 'master',
      occupation: '家族办公室负责人',
      annual_income: 1500,
      marital_history: '离异',
      has_children: true,
      children_notes: '一名孩子已在海外寄宿学校就读',
      hobbies: ['高尔夫', '旅行', '艺术收藏'],
      ai_summary: '常驻新加坡与上海之间，明确以生育资产安排型关系为主。',
      followup_strategy: '当前本地测试女方均不接受该模式，保留档案用于测试筛除逻辑。',
    },
    intention: {
      primary_intent: 'fertility',
      relationship_mode: 'fertility_asset_arrangement',
      accepts_mode_marriage_standard: 'no',
      accepts_mode_compensated_dating: 'no',
      accepts_mode_fertility_asset_arrangement: 'yes',
      preferred_age_min: 24,
      preferred_age_max: 32,
      preferred_cities: ['上海', '新加坡'],
      preferred_education: ['bachelor', 'master', 'phd'],
      preferred_income_min: 0,
      accepts_long_distance: 'yes',
      relocation_willingness: 'yes',
      fertility_preference: '希望尽快进入生育安排',
      accepts_partner_marital_history: ['未婚'],
      accepts_partner_children: 'no',
      relationship_pace: '快速确认',
      communication_style: '明确边界',
      preference_importance: { city: 'flexible', income: 'flexible' },
    },
    trait: {
      sleep_schedule: '规律',
      social_preference: '偏内向',
      emotional_stability: '稳定',
      exercise_habits: '高尔夫',
      spending_style: '高净值体验导向',
    },
    conversations: [
      {
        transcript: '我41岁，常驻新加坡和上海，做家族办公室，年收入一千五百万左右。我现在主要考虑的是生育资产安排型关系，愿意给女方和孩子做长期资产安排，但希望对方明确接受这种模式。',
        createdAt: daysAgo(3, 18),
        missingFields: ['accepts_mode_fertility_asset_arrangement'],
        suggestedQuestions: ['如果对方提出以生育和资产安排为核心的关系模式，你会考虑吗？'],
      },
    ],
  },
]

async function main() {
  const matchmaker = await resolveDemoMatchmaker()
  const cleanup = await cleanupPreviousSeed(matchmaker.id)

  const seeded = new Map<string, SeededPerson>()

  for (const seed of seedPeople) {
    const person = await insertSeedPerson(matchmaker.id, seed)
    seeded.set(seed.key, person)
  }

  const male1 = seeded.get('顾承泽')
  const female1 = seeded.get('苏晚晴')
  const male2 = seeded.get('周砚之')
  const female2 = seeded.get('林知夏')
  const female3 = seeded.get('许清嘉')

  if (!male1 || !female1 || !male2 || !female2 || !female3) {
    throw new Error('种子数据映射失败')
  }

  const matches = []
  const pair1 = await insertMatch(matchmaker.id, male1, female1, 'pending')
  if (pair1) matches.push(pair1)
  const pair2 = await insertMatch(matchmaker.id, male2, female2, 'pending')
  if (pair2) matches.push(pair2)
  const pair3 = await insertMatch(matchmaker.id, male2, female3, 'pending')
  if (pair3) matches.push(pair3)

  const pendingTaskPayload: FollowupTaskInsert = {
    matchmaker_id: matchmaker.id,
    profile_id: female2.profile.id,
    match_id: null,
    task_type: 'sensitive_confirmation',
    priority: 'high',
    field_keys: ['accepts_mode_compensated_dating', 'accepts_partner_children'],
    question_list: [
      '如果对方是带明确经济支持安排的恋爱关系，你能接受吗？',
      '如果对方有孩子，你这边能接受吗？',
    ],
    rationale: '本地测试数据：保留一条档案级待补问任务，方便测试提醒中心与客户详情页。',
    status: 'open',
    completed_at: null,
  }

  await supabase.from('followup_tasks').insert(pendingTaskPayload)

  const summary = {
    removedProfiles: cleanup.removedProfiles,
    removedMatches: cleanup.removedMatches,
    matchmaker: matchmaker.displayName,
    profiles: Array.from(seeded.values()).map((person) => ({
      id: person.profile.id,
      name: person.profile.name,
      gender: person.profile.gender,
      city: person.profile.city,
      intent: person.intention?.primary_intent,
      relationship_mode: person.intention?.relationship_mode,
    })),
    matches: matches.map((item) => ({
      id: item.match.id,
      male: item.match.male_profile_id,
      female: item.match.female_profile_id,
      recommendationType: item.match.recommendation_type,
      score: item.match.match_score,
      pendingReasons: item.match.pending_reasons,
    })),
    login: {
      email: DEMO_MATCHMAKER_EMAIL,
      url: 'http://localhost:4011/login',
    },
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
