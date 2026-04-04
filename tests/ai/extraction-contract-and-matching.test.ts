import test from 'node:test'
import assert from 'node:assert/strict'
import { parseExtractionContract, tryParseExtractionContract } from '@/lib/ai/extraction-contract'
import { calculateMatchScore, ProfileWithIntention } from '@/lib/matching/score'
import { Intention, Profile, TraitProfile } from '@/types/database'

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile',
    created_at: '2026-04-02T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
    matchmaker_id: 'mm-1',
    auth_user_id: null,
    gender: 'female',
    status: 'active',
    name: '测试',
    phone: null,
    nationality: null,
    citizenship_list: null,
    languages: null,
    age: 30,
    height: null,
    weight: null,
    hometown: null,
    city: '上海',
    current_base_cities: ['上海'],
    residency_status: null,
    visa_flexibility: null,
    travel_frequency: null,
    time_zone_pattern: null,
    education: 'master',
    school_notes: null,
    occupation: '投资',
    job_title: null,
    industry: null,
    work_intensity: null,
    work_schedule: null,
    annual_income: 300,
    income_range: null,
    net_worth_range: null,
    liquid_assets_range: null,
    assets: null,
    property_locations: null,
    support_budget_range: null,
    income_verified: null,
    assets_verified: null,
    appearance_score: null,
    photo_urls: null,
    marital_history: null,
    marital_history_verified: null,
    has_children: false,
    children_notes: null,
    hobbies: ['旅行', '徒步'],
    interest_tags: null,
    cultural_preferences: null,
    travel_style_tags: null,
    social_scene_tags: null,
    lifestyle_tags: null,
    personality_tags: null,
    smoking: false,
    drinking: false,
    family_burden_notes: null,
    parental_involvement: null,
    seriousness_score: null,
    followup_strategy: null,
    hidden_expectations: null,
    ai_summary: null,
    raw_notes: null,
    ...overrides,
  }
}

function createIntention(overrides: Partial<Intention> = {}): Intention {
  return {
    profile_id: 'profile',
    created_at: '2026-04-02T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
    primary_intent: 'marriage',
    intent_notes: null,
    relationship_mode: 'marriage_standard',
    relationship_mode_notes: null,
    accepts_mode_marriage_standard: 'yes',
    accepts_mode_compensated_dating: 'unknown',
    accepts_mode_fertility_asset_arrangement: 'unknown',
    mode_boundary_notes: null,
    financial_arrangement_expectation: null,
    financial_arrangement_boundary: null,
    exclusive_relationship_requirement: null,
    preferred_age_min: 28,
    preferred_age_max: 36,
    preferred_height_min: null,
    preferred_cities: ['上海'],
    preferred_education: ['bachelor', 'master'],
    preferred_income_min: 100,
    preferred_net_worth_min: null,
    preferred_industry_tags: null,
    dealbreakers: null,
    tolerance_notes: null,
    acceptable_conditions: null,
    accepts_long_distance: 'yes',
    long_distance_notes: null,
    fertility_preference: '想要孩子',
    fertility_timeline: null,
    desired_children_count: null,
    biological_child_requirement: null,
    co_parenting_expectation: null,
    child_support_expectation: null,
    inheritance_expectation: null,
    prenup_acceptance: 'unknown',
    settle_city_preferences: ['上海'],
    relocation_willingness: 'yes',
    accepts_partner_marital_history: ['未婚'],
    accepts_partner_children: 'yes',
    relationship_pace: '慢热',
    communication_style: '坦诚沟通',
    biggest_concerns: null,
    implicit_intent_notes: null,
    preference_importance: { city: 'important', income: 'hard' },
    ...overrides,
  }
}

function createTraitProfile(overrides: Partial<TraitProfile> = {}): TraitProfile {
  return {
    profile_id: 'profile',
    created_at: '2026-04-02T00:00:00.000Z',
    updated_at: '2026-04-02T00:00:00.000Z',
    hobby_ranked_tags: null,
    exercise_habits: '每周健身',
    diet_habits: '清淡',
    sleep_schedule: '早睡早起',
    smoking_habit: '不吸烟',
    drinking_habit: '偶尔饮酒',
    social_preference: '平衡',
    spending_style: '理性',
    emotional_stability: '稳定',
    ...overrides,
  }
}

function createPerson(profileOverrides: Partial<Profile>, intentionOverrides: Partial<Intention>, traitOverrides: Partial<TraitProfile> = {}): ProfileWithIntention {
  return {
    ...createProfile(profileOverrides),
    intention: createIntention(intentionOverrides),
    traitProfile: createTraitProfile(traitOverrides),
  }
}

test('parseExtractionContract 会补齐字段中文名并去重补问', () => {
  const parsed = parseExtractionContract({
    field_updates: [
      {
        field_key: 'city',
        action: 'set',
        new_value: '北京',
        confidence: 'high',
        evidence_excerpt: '我现在在北京工作。',
      },
    ],
    suggested_followup_questions: ['请确认是否接受异地？', '请确认是否接受异地？'],
    processing_notes: [' note ', 'note'],
  })

  assert.equal(parsed.field_updates[0]?.field_label, '所在城市')
  assert.deepEqual(parsed.suggested_followup_questions, ['请确认是否接受异地？'])
  assert.deepEqual(parsed.processing_notes, ['note'])
})

test('tryParseExtractionContract 会忽略未知字段并保留其他字段', () => {
  const result = tryParseExtractionContract({
    field_updates: [
      {
        field_key: 'mbti',
        action: 'set',
        new_value: 'INTP',
        confidence: 'high',
      },
      {
        field_key: 'age',
        action: 'set',
        new_value: 35,
        confidence: 'high',
      },
    ],
  })

  assert.equal(result.success, true)
  assert.deepEqual(result.data.field_updates.map((item) => item.field_key), ['age'])
  assert.match(result.data.processing_notes.join('\n'), /已忽略无法识别的字段/)
})

test('parseExtractionContract 兼容第三方模型的近似字段名', () => {
  const parsed = parseExtractionContract({
    field_updates: [
      {
        key: 'age',
        label: '年龄',
        new_value: 35,
        confidence: 'high',
        source: '我是男生,35岁',
      },
    ],
    review_required: [
      {
        key: 'profile_gender',
        label: '性别与档案一致性',
        reason: '档案与自述性别冲突',
        candidate_values: ['male', 'female'],
        source: '我是男生',
      },
    ],
    missing_critical_fields: ['relationship_mode'],
    suggested_followup_questions: ['请确认您说的经济支持具体指什么？'],
    summary_updates: {
      ai_summary: '35岁男性，上海做投资。',
    },
    processing_notes: ['存在身份冲突'],
  })

  assert.equal(parsed.field_updates[0]?.field_key, 'age')
  assert.equal(parsed.field_updates[0]?.action, 'set')
  assert.equal(parsed.field_updates[0]?.evidence_excerpt, '我是男生,35岁')
  assert.equal(parsed.review_required[0]?.field_key, 'profile_gender')
  assert.equal(parsed.review_required[0]?.issue_type, 'identity_conflict')
})

test('parseExtractionContract 兼容第三方模型的近义 issue_type', () => {
  const parsed = parseExtractionContract({
    review_required: [
      {
        field_key: 'relationship_mode',
        issue_type: 'potential_mode_change',
        confidence: 'medium',
        reason: '关系模式疑似发生变化',
        candidate_value: 'compensated_dating',
      },
      {
        field_key: 'primary_intent',
        issue_type: 'intent_change',
        confidence: 'medium',
        reason: '宏观意图疑似发生变化',
        candidate_value: 'dating',
      },
    ],
  })

  assert.equal(parsed.review_required[0]?.issue_type, 'value_conflict')
  assert.equal(parsed.review_required[1]?.issue_type, 'value_conflict')
})

test('parseExtractionContract 兼容数字置信度与 inference_required', () => {
  const parsed = parseExtractionContract({
    field_updates: [
      {
        field_key: 'age',
        value: 28,
        confidence: 0.95,
      },
      {
        field_key: 'accepts_long_distance',
        value: 'no',
        confidence: '0.72',
      },
    ],
    review_required: [
      {
        field_key: 'accepts_mode_marriage_standard',
        issue_type: 'inference_required',
        confidence: 0.75,
        candidate_value: 'yes',
      },
    ],
  })

  assert.equal(parsed.field_updates[0]?.confidence, 'high')
  assert.equal(parsed.field_updates[1]?.confidence, 'medium')
  assert.equal(parsed.review_required[0]?.confidence, 'medium')
  assert.equal(parsed.review_required[0]?.issue_type, 'ambiguous_statement')
})

test('parseExtractionContract 兼容对象形式的缺失字段与补问', () => {
  const parsed = parseExtractionContract({
    missing_critical_fields: [
      { field_key: 'relationship_mode', label: '男方关系模式' },
      { key: 'fertility_preference' },
      'accepts_partner_children',
    ],
    suggested_followup_questions: [
      { question: '你现在更明确是哪种关系模式？' },
      { text: '你有没有想过以后要孩子？' },
      '如果对方有孩子，你这边能接受吗？',
    ],
  })

  assert.deepEqual(parsed.missing_critical_fields, [
    'fertility_preference',
    'accepts_partner_children',
  ])
  assert.deepEqual(parsed.suggested_followup_questions, [
    '你自己未来有没有想生孩子的打算？',
    '对方如果有孩子，你这边能接受吗？',
  ])
})

test('parseExtractionContract 会过滤 V1 默认后置的特殊模式缺口与补问', () => {
  const parsed = parseExtractionContract({
    missing_critical_fields: [
      'relationship_mode',
      'accepts_mode_compensated_dating',
      'accepts_mode_fertility_asset_arrangement',
      'fertility_preference',
    ],
    suggested_followup_questions: [
      '你现在更明确是奔着结婚，还是恋爱带经济安排，还是生育资产安排这类模式？',
      '如果对方是恋爱关系里带明确经济安排，你能接受吗？',
      '如果对方是以生育和资产安排为核心的关系模式，你会考虑吗？',
      '你自己未来有没有想生孩子的打算？',
    ],
  })

  assert.deepEqual(parsed.missing_critical_fields, ['fertility_preference'])
  assert.deepEqual(parsed.suggested_followup_questions, ['你自己未来有没有想生孩子的打算？'])
  assert.match(parsed.processing_notes.join('\n'), /V1 默认不追问的特殊模式字段已后置/)
})

test('parseExtractionContract 会过滤非法异常字段和非白名单总结字段', () => {
  const parsed = parseExtractionContract({
    review_required: [
      {
        field_key: 'completely_unknown_field',
        issue_type: 'ambiguous_statement',
        confidence: 'medium',
        reason: '模型随手加的未知字段',
      },
      {
        field_key: 'profile_gender',
        issue_type: 'identity_conflict',
        confidence: 'high',
        reason: '档案性别与自述冲突',
      },
    ],
    summary_updates: {
      'AI 综合描述': '35岁男性，上海做投资。',
      age: 35,
      不存在字段: '忽略我',
    },
  })

  assert.deepEqual(parsed.review_required.map((item) => item.field_key), ['profile_gender'])
  assert.deepEqual(parsed.summary_updates, {
    ai_summary: '35岁男性，上海做投资。',
  })
  assert.match(parsed.processing_notes.join('\n'), /已忽略无法识别的异常字段/)
  assert.match(parsed.processing_notes.join('\n'), /已忽略不受支持的总结字段/)
})

test('parseExtractionContract 兼容中文字段名和近似中文别名', () => {
  const parsed = parseExtractionContract({
    field_updates: [
      {
        field_key: '年龄',
        new_value: 35,
        confidence: 'high',
        source: '我今年35岁。',
      },
      {
        field_key: '城市',
        new_value: '上海',
        confidence: 'high',
        source: '我现在主要在上海。',
      },
      {
        field_key: '关系模式',
        new_value: 'compensated_dating',
        confidence: 'high',
        source: '我更偏向恋爱且带经济安排。',
      },
      {
        field_key: '接受恋爱且带经济安排',
        new_value: 'yes',
        confidence: 'high',
        source: '如果合适我可以接受。',
      },
    ],
    missing_critical_fields: ['生育意愿', '接受对方有孩子'],
  })

  assert.deepEqual(
    parsed.field_updates.map((item) => item.field_key),
    ['age', 'city', 'relationship_mode', 'accepts_mode_compensated_dating']
  )
  assert.deepEqual(parsed.missing_critical_fields, [
    'fertility_preference',
    'accepts_partner_children',
  ])
})

test('特殊关系模式未知时不再默认进入 pending_confirmation', () => {
  const male = createPerson(
    { id: 'male-1', gender: 'male', name: '男方', city: '上海', annual_income: 500 },
    { profile_id: 'male-1', relationship_mode: 'compensated_dating', primary_intent: 'dating' }
  )
  const female = createPerson(
    { id: 'female-1', gender: 'female', name: '女方', city: '上海', annual_income: 200 },
    {
      profile_id: 'female-1',
      relationship_mode: 'marriage_standard',
      primary_intent: 'dating',
      accepts_mode_compensated_dating: 'unknown',
    }
  )

  const result = calculateMatchScore(male, female)

  assert.equal(result.recommendationType, 'confirmed')
  assert.equal(result.pendingFields.includes('女方是否接受恋爱且带经济安排'), false)
  assert.equal(result.suggestedFollowupQuestions.length, 0)
  assert.ok(result.breakdown.directional_notes.some((note) => note.includes('女方态度暂未知')))
})

test('特殊关系模式明确不接受时仍会被排除', () => {
  const male = createPerson(
    { id: 'male-1', gender: 'male', name: '男方', city: '上海', annual_income: 500 },
    { profile_id: 'male-1', relationship_mode: 'compensated_dating', primary_intent: 'dating' }
  )
  const female = createPerson(
    { id: 'female-1', gender: 'female', name: '女方', city: '上海', annual_income: 200 },
    {
      profile_id: 'female-1',
      primary_intent: 'dating',
      accepts_mode_compensated_dating: 'no',
    }
  )

  const result = calculateMatchScore(male, female)

  assert.equal(result.recommendationType, 'rejected')
  assert.ok(result.hardConflicts.includes('女方是否接受恋爱且带经济安排'))
})
