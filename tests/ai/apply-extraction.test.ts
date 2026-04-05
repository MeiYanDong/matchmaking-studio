import test from 'node:test'
import assert from 'node:assert/strict'
import { applyExtractionContractToProfile } from '@/lib/ai/apply-extraction'
import { ExtractionContract } from '@/lib/ai/extraction-contract'
import { Conversation, Intention, Profile, TraitProfile } from '@/types/database'

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    created_at: '2026-04-02T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
    matchmaker_id: 'mm-1',
    auth_user_id: null,
    gender: 'female',
    status: 'active',
    name: '测试客户',
    phone: null,
    nationality: null,
    citizenship_list: null,
    languages: null,
    age: null,
    height: null,
    weight: null,
    hometown: null,
    city: '上海',
    current_base_cities: null,
    residency_status: null,
    visa_flexibility: null,
    travel_frequency: null,
    time_zone_pattern: null,
    education: null,
    school_notes: null,
    occupation: null,
    job_title: null,
    industry: null,
    work_intensity: null,
    work_schedule: null,
    annual_income: null,
    income_range: null,
    net_worth_range: null,
    liquid_assets_range: null,
    assets: null,
    property_locations: null,
    support_budget_range: null,
    income_verified: null,
    assets_verified: null,
    appearance_score: null,
    avatar_url: null,
    lifestyle_photo_urls: null,
    photo_urls: null,
    marital_history: null,
    marital_history_verified: null,
    has_children: null,
    children_notes: null,
    hobbies: null,
    interest_tags: null,
    cultural_preferences: null,
    travel_style_tags: null,
    social_scene_tags: null,
    lifestyle_tags: null,
    personality_tags: null,
    smoking: null,
    drinking: null,
    family_burden_notes: null,
    parental_involvement: null,
    seriousness_score: null,
    followup_strategy: null,
    hidden_expectations: null,
    ai_summary: null,
    raw_notes: null,
    // Phase-1 新字段
    full_name: null,
    display_name: null,
    current_city: null,
    birth_year_month: null,
    height_cm: null,
    weight_kg: null,
    wechat_id: null,
    education_level_v2: null,
    bachelor_school: null,
    master_school: null,
    doctor_school: null,
    major: null,
    company_name: null,
    monthly_income: null,
    income_source_type: null,
    has_property: null,
    property_count: null,
    property_notes: null,
    has_vehicle: null,
    vehicle_brand: null,
    vehicle_model: null,
    vehicle_notes: null,
    family_asset_band: null,
    financial_assets_notes: null,
    insurance_notes: null,
    marital_history_enum: null,
    marital_history_notes: null,
    has_children_enum: null,
    children_count: null,
    children_age_notes: null,
    custody_status: null,
    financial_ties_with_ex_partner: null,
    smokes: null,
    smoking_frequency: null,
    drinks: null,
    drinking_frequency: null,
    urgency_level: null,
    hukou_city: null,
    native_place: null,
    siblings_summary: null,
    parents_occupation: null,
    parents_marital_status: null,
    family_origin_notes: null,
    mbti: null,
    personality_summary: null,
    self_description: null,
    ...overrides,
  }
}

function createIntention(overrides: Partial<Intention> = {}): Intention {
  return {
    profile_id: 'profile-1',
    created_at: '2026-04-02T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
    primary_intent: null,
    intent_notes: null,
    relationship_mode: null,
    relationship_mode_notes: null,
    accepts_mode_marriage_standard: 'unknown',
    accepts_mode_compensated_dating: 'unknown',
    accepts_mode_fertility_asset_arrangement: 'unknown',
    mode_boundary_notes: null,
    financial_arrangement_expectation: null,
    financial_arrangement_boundary: null,
    exclusive_relationship_requirement: null,
    preferred_age_min: null,
    preferred_age_max: null,
    preferred_height_min: null,
    preferred_cities: null,
    preferred_education: null,
    preferred_income_min: null,
    preferred_net_worth_min: null,
    preferred_industry_tags: null,
    dealbreakers: null,
    tolerance_notes: null,
    acceptable_conditions: null,
    accepts_long_distance: 'unknown',
    long_distance_notes: null,
    fertility_preference: null,
    fertility_timeline: null,
    desired_children_count: null,
    biological_child_requirement: null,
    co_parenting_expectation: null,
    child_support_expectation: null,
    inheritance_expectation: null,
    prenup_acceptance: 'unknown',
    settle_city_preferences: null,
    relocation_willingness: 'unknown',
    accepts_partner_marital_history: null,
    accepts_partner_children: 'unknown',
    relationship_pace: null,
    communication_style: null,
    biggest_concerns: null,
    implicit_intent_notes: null,
    preference_importance: null,
    ...overrides,
  }
}

function createTraitProfile(overrides: Partial<TraitProfile> = {}): TraitProfile {
  return {
    profile_id: 'profile-1',
    created_at: '2026-04-02T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
    hobby_ranked_tags: null,
    exercise_habits: null,
    diet_habits: null,
    sleep_schedule: null,
    smoking_habit: null,
    drinking_habit: null,
    social_preference: null,
    spending_style: null,
    emotional_stability: null,
    ...overrides,
  }
}

function createConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    created_at: '2026-04-02T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
    profile_id: 'profile-1',
    matchmaker_id: 'mm-1',
    audio_url: 'audio/test.mp3',
    audio_duration: 123,
    talked_at: null,
    transcript: '测试对话',
    transcript_verbose_json: null,
    extracted_fields: null,
    extraction_notes: null,
    missing_fields: null,
    suggested_questions: null,
    reviewed_by: null,
    reviewed_at: null,
    status: 'done',
    error_message: null,
    ...overrides,
  }
}

function createMockSupabase() {
  const operations: Array<{ table: string; action: 'update' | 'upsert' | 'insert'; payload: unknown; filters?: Record<string, unknown> }> = []

  return {
    operations,
    client: {
      from(table: string) {
        return {
          update(payload: unknown) {
            return {
              eq(column: string, value: unknown) {
                operations.push({ table, action: 'update', payload, filters: { [column]: value } })
                return Promise.resolve({ data: null, error: null })
              },
            }
          },
          upsert(payload: unknown) {
            operations.push({ table, action: 'upsert', payload })
            return Promise.resolve({ data: null, error: null })
          },
          insert(payload: unknown) {
            operations.push({ table, action: 'insert', payload })
            return Promise.resolve({ data: null, error: null })
          },
        }
      },
    },
  }
}

function createContract(overrides: Partial<ExtractionContract>): ExtractionContract {
  return {
    field_updates: [],
    review_required: [],
    missing_critical_fields: [],
    suggested_followup_questions: [],
    summary_updates: {},
    processing_notes: [],
    ...overrides,
  }
}

test('明确新值会覆盖旧值并写回 profiles', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile({ city: '上海' }),
    intention: createIntention(),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      field_updates: [
        {
          field_key: 'city',
          field_label: '所在城市',
          action: 'set',
          new_value: '北京',
          confidence: 'high',
          evidence_excerpt: '我现在长期在北京工作。',
          auto_apply: true,
        },
      ],
    }),
  })

  const profileUpdate = mock.operations.find((item) => item.table === 'profiles')
  assert.ok(profileUpdate)
  assert.equal((profileUpdate?.payload as { city?: string }).city, '北京')
  assert.equal(result.appliedFieldUpdates.length, 1)
  assert.equal(result.reviewRequired.length, 0)
})

test('自动写入字段时会同步记录 field_observations', async () => {
  const mock = createMockSupabase()

  await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile({ city: '上海' }),
    intention: createIntention(),
    traitProfile: createTraitProfile(),
    conversation: createConversation({ id: 'conv-observation' }),
    contract: createContract({
      field_updates: [
        {
          field_key: 'city',
          field_label: '所在城市',
          action: 'set',
          new_value: '杭州',
          confidence: 'high',
          evidence_excerpt: '我现在长期在杭州办公。',
          auto_apply: true,
        },
      ],
    }),
  })

  const insertOperation = mock.operations.find(
    (operation) => operation.table === 'field_observations' && operation.action === 'insert'
  )

  assert.ok(insertOperation)
  assert.deepEqual(insertOperation?.payload, [
    {
      profile_id: 'profile-1',
      conversation_id: 'conv-observation',
      field_key: 'city',
      field_value_json: '杭州',
      source_type: 'ai_extracted',
      confidence: 92,
      verification_status: 'unverified',
      evidence_text: '我现在长期在杭州办公。',
      start_time_seconds: null,
      end_time_seconds: null,
    },
  ])
})

test('unknown 不会覆盖已有 yes/no', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile(),
    intention: createIntention({ accepts_partner_children: 'yes' }),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      field_updates: [
        {
          field_key: 'accepts_partner_children',
          field_label: '是否接受对方有孩子',
          action: 'set',
          new_value: 'unknown',
          confidence: 'high',
          evidence_excerpt: '这个我还没问清楚。',
          auto_apply: true,
        },
      ],
    }),
  })

  assert.equal(mock.operations.some((item) => item.table === 'intentions'), false)
  assert.equal(result.appliedFieldUpdates.length, 0)
  assert.equal(result.reviewRequired.length, 0)
})

test('模糊新值不会覆盖明确旧值', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile({ annual_income: 300 }),
    intention: createIntention(),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      field_updates: [
        {
          field_key: 'annual_income',
          field_label: '年收入',
          action: 'set',
          new_value: '收入还可以',
          confidence: 'medium',
          evidence_excerpt: '收入还可以，够花。',
          auto_apply: true,
        },
      ],
    }),
  })

  assert.equal(mock.operations.some((item) => item.table === 'profiles'), false)
  assert.equal(result.appliedFieldUpdates.length, 0)
  assert.equal(result.reviewRequired.length, 0)
})

test('敏感字段缺少证据时进入 review_required 而不是自动入库', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile(),
    intention: createIntention(),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      field_updates: [
        {
          field_key: 'accepts_mode_compensated_dating',
          field_label: '是否接受恋爱且带经济安排',
          action: 'set',
          new_value: 'yes',
          confidence: 'high',
          auto_apply: true,
        },
      ],
    }),
  })

  assert.equal(mock.operations.some((item) => item.table === 'intentions'), false)
  assert.equal(result.appliedFieldUpdates.length, 0)
  assert.equal(result.reviewRequired.length, 1)
  assert.equal(result.reviewRequired[0]?.field_key, 'accepts_mode_compensated_dating')
})

test('tri-state 从 unknown 更新为 yes 时会自动写入并触发匹配相关变更', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile(),
    intention: createIntention({ accepts_mode_compensated_dating: 'unknown' }),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      field_updates: [
        {
          field_key: 'accepts_mode_compensated_dating',
          field_label: '女方是否接受恋爱且带经济安排',
          action: 'set',
          new_value: 'yes',
          confidence: 'high',
          evidence_excerpt: '如果恋爱里有明确经济支持安排，只要边界清楚，我可以接受。',
          auto_apply: true,
        },
      ],
    }),
  })

  const intentionUpdate = mock.operations.find((item) => item.table === 'intentions')
  assert.ok(intentionUpdate)
  assert.equal((intentionUpdate?.payload as { accepts_mode_compensated_dating?: string }).accepts_mode_compensated_dating, 'yes')
  assert.equal(result.appliedFieldUpdates.length, 1)
  assert.equal(result.reviewRequired.length, 0)
  assert.equal(result.matchingRelevantChanged, true)
})

test('明确事实字段在 medium 置信度且无旧值时会自动写入，而不是进入待确认异常', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile({ city: null, age: null, height: null, current_base_cities: null }),
    intention: createIntention(),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      field_updates: [
        {
          field_key: 'age',
          field_label: '年龄',
          action: 'set',
          new_value: 28,
          confidence: 'medium',
          evidence_excerpt: '我今年 28 岁。',
          auto_apply: true,
        },
        {
          field_key: 'height',
          field_label: '身高',
          action: 'set',
          new_value: 164,
          confidence: 'medium',
          evidence_excerpt: '我身高 164。',
          auto_apply: true,
        },
        {
          field_key: 'city',
          field_label: '所在城市',
          action: 'set',
          new_value: '杭州',
          confidence: 'medium',
          evidence_excerpt: '我现在在杭州工作。',
          auto_apply: true,
        },
        {
          field_key: 'current_base_cities',
          field_label: '常驻城市',
          action: 'set',
          new_value: ['杭州'],
          confidence: 'medium',
          evidence_excerpt: '目前主要就在杭州发展。',
          auto_apply: true,
        },
      ],
    }),
  })

  const profileUpdate = mock.operations.find((item) => item.table === 'profiles')
  assert.ok(profileUpdate)
  assert.equal((profileUpdate?.payload as { age?: number }).age, 28)
  assert.equal((profileUpdate?.payload as { height?: number }).height, 164)
  assert.equal((profileUpdate?.payload as { city?: string }).city, '杭州')
  assert.deepEqual((profileUpdate?.payload as { current_base_cities?: string[] }).current_base_cities, ['杭州'])
  assert.equal(result.appliedFieldUpdates.length, 4)
  assert.equal(result.reviewRequired.length, 0)
})

test('推导出的偏好字段在 medium 置信度下继续进入待确认，并标记为低置信度', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile({ age: 28 }),
    intention: createIntention(),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      field_updates: [
        {
          field_key: 'preferred_age_min',
          field_label: '期望最小年龄',
          action: 'set',
          new_value: 28,
          confidence: 'medium',
          evidence_excerpt: '希望对方比我大两三岁。',
          auto_apply: true,
        },
      ],
    }),
  })

  assert.equal(mock.operations.some((item) => item.table === 'intentions'), false)
  assert.equal(result.appliedFieldUpdates.length, 0)
  assert.equal(result.reviewRequired.length, 1)
  assert.equal(result.reviewRequired[0]?.field_key, 'preferred_age_min')
  assert.equal(result.reviewRequired[0]?.issue_type, 'low_confidence')
})

test('原始 review_required 会补齐当前值和 AI 候选值，供审核页展示', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile({ age: 36, annual_income: 520 }),
    intention: createIntention(),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      field_updates: [
        {
          field_key: 'age',
          field_label: '年龄',
          action: 'set',
          new_value: 35,
          confidence: 'low',
          evidence_excerpt: '我是35岁。',
          auto_apply: false,
        },
        {
          field_key: 'annual_income',
          field_label: '年收入',
          action: 'set',
          new_value: 500,
          confidence: 'low',
          evidence_excerpt: '年收入500万。',
          auto_apply: false,
        },
      ],
      review_required: [
        {
          field_key: 'age',
          field_label: '年龄',
          issue_type: 'ambiguous_statement',
          confidence: 'medium',
          reason: '年龄倒退，需人工确认',
        },
        {
          field_key: 'annual_income',
          field_label: '年收入',
          issue_type: 'ambiguous_statement',
          confidence: 'medium',
          reason: '收入变化，需人工确认',
        },
      ],
    }),
  })

  assert.equal(result.reviewRequired.length, 2)
  assert.equal(result.reviewRequired[0]?.old_value, 36)
  assert.equal(result.reviewRequired[0]?.candidate_value, 35)
  assert.equal(result.reviewRequired[1]?.old_value, 520)
  assert.equal(result.reviewRequired[1]?.candidate_value, 500)
})

test('review_required 中的空候选值会回填为可展示的 AI 候选值', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile(),
    intention: createIntention({ relationship_mode: 'marriage_standard' }),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      field_updates: [
        {
          field_key: 'relationship_mode',
          field_label: '男方关系模式',
          action: 'set',
          new_value: 'compensated_dating',
          confidence: 'high',
          evidence_excerpt: '我更偏向恋爱且带经济安排。',
          auto_apply: true,
        },
      ],
      review_required: [
        {
          field_key: 'relationship_mode',
          field_label: '男方关系模式',
          issue_type: 'ambiguous_statement',
          old_value: null,
          candidate_value: '',
          confidence: 'medium',
          reason: '关系模式变化较大，建议复核',
        },
      ],
    }),
  })

  assert.equal(result.reviewRequired.length, 1)
  assert.equal(result.reviewRequired[0]?.old_value, 'marriage_standard')
  assert.equal(result.reviewRequired[0]?.candidate_value, 'compensated_dating')
})

test('没有实际变更或只有 unknown 候选值的异常会从审核页过滤掉', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile(),
    intention: createIntention({ primary_intent: 'dating' }),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      review_required: [
        {
          field_key: 'primary_intent',
          field_label: '宏观意图',
          issue_type: 'value_conflict',
          candidate_value: 'dating',
          confidence: 'medium',
          reason: '候选值与当前值相同，不应继续打扰红娘',
        },
        {
          field_key: 'support_budget_range',
          field_label: '支持预算区间',
          issue_type: 'ambiguous_statement',
          candidate_value: 'unknown',
          confidence: 'medium',
          reason: '只有待补问，没有有效候选值',
        },
        {
          field_key: 'profile_gender',
          field_label: '性别归属',
          issue_type: 'identity_conflict',
          confidence: 'high',
          reason: '系统归属冲突仍需保留',
        },
      ],
    }),
  })

  assert.deepEqual(result.reviewRequired.map((item) => item.field_key), ['profile_gender'])
})

test('待补问型占位候选值不会继续进入异常确认区', async () => {
  const mock = createMockSupabase()
  const result = await applyExtractionContractToProfile({
    supabase: mock.client as never,
    profile: createProfile(),
    intention: createIntention(),
    traitProfile: createTraitProfile(),
    conversation: createConversation(),
    contract: createContract({
      review_required: [
        {
          field_key: 'financial_arrangement_expectation',
          field_label: '财务安排预期',
          issue_type: 'low_confidence',
          candidate_value: '需询问月度或年度预算范围',
          confidence: 'medium',
          reason: '客户提到了经济安排，但还没有给出具体数值。',
        },
      ],
      missing_critical_fields: ['financial_arrangement_expectation'],
      suggested_followup_questions: ['你更倾向于月度支持，还是一次性安排？'],
    }),
  })

  assert.deepEqual(result.reviewRequired, [])

  const conversationUpdate = mock.operations.find((item) => item.table === 'conversations')
  assert.ok(conversationUpdate)
  const extractedFields = (conversationUpdate?.payload as { extracted_fields?: Record<string, unknown> }).extracted_fields
  assert.deepEqual(extractedFields?.review_required, [])
  assert.deepEqual(extractedFields?.missing_critical_fields, ['financial_arrangement_expectation'])
})
