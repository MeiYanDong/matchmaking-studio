import { Intention, Profile, TraitProfile, TriState } from '@/types/database'
import { ScoreBreakdown } from '@/types/app'

export type ProfileWithIntention = Profile & {
  intention: Intention | null
  traitProfile: TraitProfile | null
}

type MatchEvaluation = {
  total: number
  breakdown: ScoreBreakdown
  recommendationType: 'confirmed' | 'pending_confirmation' | 'rejected'
  qualifies: boolean
  hardConflicts: string[]
  pendingFields: string[]
  pendingReasons: string[]
  requiredFollowupFields: string[]
  suggestedFollowupQuestions: string[]
}

const RAW_SCORE_MAX = 85

function ensureStringArray(value: string[] | null | undefined) {
  return value?.filter(Boolean) ?? []
}

function textIncludesAny(source: string | null | undefined, keywords: string[]) {
  if (!source) return false
  return keywords.some((keyword) => source.includes(keyword))
}

function importanceLevel(intention: Intention | null, key: string) {
  const raw = intention?.preference_importance
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'normal'
  const value = (raw as Record<string, unknown>)[key]
  return value === 'hard' || value === 'important' || value === 'normal' || value === 'flexible'
    ? value
    : 'normal'
}

function importanceWeight(level: string) {
  switch (level) {
    case 'hard':
      return 1.4
    case 'important':
      return 1.2
    case 'flexible':
      return 0.75
    default:
      return 1
  }
}

function importanceIsHard(level: string) {
  return level === 'hard'
}

function resolveModeAcceptance(female: ProfileWithIntention, male: ProfileWithIntention): {
  state: TriState
  fieldKey: string | null
  fieldLabel: string | null
} {
  const mode = male.intention?.relationship_mode

  if (!mode) {
    return {
      state: 'unknown',
      fieldKey: 'relationship_mode',
      fieldLabel: '男方关系模式',
    }
  }

  if (mode === 'marriage_standard') {
    return {
      state: female.intention?.accepts_mode_marriage_standard ?? 'unknown',
      fieldKey: 'accepts_mode_marriage_standard',
      fieldLabel: '女方是否接受标准婚恋',
    }
  }

  if (mode === 'compensated_dating') {
    return {
      state: female.intention?.accepts_mode_compensated_dating ?? 'unknown',
      fieldKey: 'accepts_mode_compensated_dating',
      fieldLabel: '女方是否接受恋爱且带经济安排',
    }
  }

  return {
    state: female.intention?.accepts_mode_fertility_asset_arrangement ?? 'unknown',
    fieldKey: 'accepts_mode_fertility_asset_arrangement',
    fieldLabel: '女方是否接受生育资产安排型',
  }
}

function scoreIntentStage(male: ProfileWithIntention, female: ProfileWithIntention) {
  const maleIntent = male.intention?.primary_intent
  const femaleIntent = female.intention?.primary_intent

  if (!maleIntent || !femaleIntent) return { score: 9, notes: ['至少一方宏观意图未知'] }
  if (maleIntent === femaleIntent) return { score: 15, notes: ['双方宏观意图一致'] }
  if (
    (maleIntent === 'marriage' && femaleIntent === 'fertility') ||
    (maleIntent === 'fertility' && femaleIntent === 'marriage')
  ) {
    return { score: 12, notes: ['婚育目标部分兼容'] }
  }

  return { score: 5, notes: ['宏观意图存在明显差异'] }
}

function scoreCityMobility(
  male: ProfileWithIntention,
  female: ProfileWithIntention,
  hardConflicts: string[],
  pendingFields: string[]
) {
  const maleCities = new Set([male.city, ...ensureStringArray(male.current_base_cities)].filter(Boolean))
  const femaleCities = new Set([female.city, ...ensureStringArray(female.current_base_cities)].filter(Boolean))

  const overlap = [...maleCities].some((city) => femaleCities.has(city))
  if (overlap) {
    return { score: 10, notes: ['存在同城或常驻城市重合'] }
  }

  const maleAcceptsLong = male.intention?.accepts_long_distance ?? 'unknown'
  const femaleAcceptsLong = female.intention?.accepts_long_distance ?? 'unknown'
  const maleMove = male.intention?.relocation_willingness ?? 'unknown'
  const femaleMove = female.intention?.relocation_willingness ?? 'unknown'

  if (maleAcceptsLong === 'unknown') pendingFields.push('男方是否接受异地')
  if (femaleAcceptsLong === 'unknown') pendingFields.push('女方是否接受异地')

  if (maleAcceptsLong === 'no' && femaleMove === 'no') {
    hardConflicts.push('地域与迁居意愿冲突')
    return { score: 0, notes: ['男方不接受异地，女方也不愿迁居'] }
  }

  if (femaleAcceptsLong === 'no' && maleMove === 'no') {
    hardConflicts.push('地域与迁居意愿冲突')
    return { score: 0, notes: ['女方不接受异地，男方也不愿迁居'] }
  }

  const bothFlexible =
    (maleAcceptsLong === 'yes' || maleMove === 'yes')
    && (femaleAcceptsLong === 'yes' || femaleMove === 'yes')

  if (bothFlexible) {
    return { score: 7, notes: ['异地存在，但双方至少一方愿接受或迁居'] }
  }

  return { score: 4, notes: ['地域匹配一般，需继续确认异地/迁居边界'] }
}

function scoreMarriageChildren(
  male: ProfileWithIntention,
  female: ProfileWithIntention,
  hardConflicts: string[],
  pendingFields: string[]
) {
  let score = 15
  const notes: string[] = []

  const maleAcceptedMarital = ensureStringArray(male.intention?.accepts_partner_marital_history)
  const femaleAcceptedMarital = ensureStringArray(female.intention?.accepts_partner_marital_history)

  if (maleAcceptedMarital.length && female.marital_history && !maleAcceptedMarital.includes(female.marital_history)) {
    hardConflicts.push('男方不接受女方婚史')
    score = 0
  }

  if (femaleAcceptedMarital.length && male.marital_history && !femaleAcceptedMarital.includes(male.marital_history)) {
    hardConflicts.push('女方不接受男方婚史')
    score = 0
  }

  const maleAcceptsChildren = male.intention?.accepts_partner_children ?? 'unknown'
  const femaleAcceptsChildren = female.intention?.accepts_partner_children ?? 'unknown'

  if (maleAcceptsChildren === 'unknown') pendingFields.push('男方是否接受对方有孩子')
  if (femaleAcceptsChildren === 'unknown') pendingFields.push('女方是否接受对方有孩子')

  if (female.has_children && maleAcceptsChildren === 'no') {
    hardConflicts.push('男方不接受对方有孩子')
    score = 0
  }

  if (male.has_children && femaleAcceptsChildren === 'no') {
    hardConflicts.push('女方不接受对方有孩子')
    score = 0
  }

  if (score > 0) {
    if (!male.intention?.fertility_preference && !female.intention?.fertility_preference) {
      pendingFields.push('双方生育意愿待确认')
      score -= 3
    } else if (
      textIncludesAny(male.intention?.fertility_preference, ['不想', '不要'])
      && textIncludesAny(female.intention?.fertility_preference, ['想', '要'])
    ) {
      score -= 5
      notes.push('生育意愿存在差异')
    } else if (
      textIncludesAny(female.intention?.fertility_preference, ['不想', '不要'])
      && textIncludesAny(male.intention?.fertility_preference, ['想', '要'])
    ) {
      score -= 5
      notes.push('生育意愿存在差异')
    }
  }

  return { score: Math.max(0, score), notes }
}

function scoreEconomics(
  male: ProfileWithIntention,
  female: ProfileWithIntention,
  hardConflicts: string[]
) {
  let score = 10
  const notes: string[] = []

  const femaleIncomeRequirement = female.intention?.preferred_income_min
  if (femaleIncomeRequirement && male.annual_income) {
    if (male.annual_income < femaleIncomeRequirement) {
      const importance = importanceLevel(female.intention, 'income')
      if (importanceIsHard(importance)) {
        hardConflicts.push('女方最低收入要求不匹配')
        return { score: 0, notes: ['男方收入低于女方硬性要求'] }
      }

      score -= Math.min(6, Math.round(((femaleIncomeRequirement - male.annual_income) / femaleIncomeRequirement) * 10))
      notes.push('男方收入略低于女方预期')
    }
  }

  const maleIncomeRequirement = male.intention?.preferred_income_min
  if (maleIncomeRequirement && female.annual_income) {
    if (female.annual_income < maleIncomeRequirement) {
      const importance = importanceLevel(male.intention, 'income')
      if (importanceIsHard(importance)) {
        hardConflicts.push('男方最低收入要求不匹配')
        return { score: 0, notes: ['女方收入低于男方硬性要求'] }
      }

      score -= Math.min(4, Math.round(((maleIncomeRequirement - female.annual_income) / maleIncomeRequirement) * 8))
      notes.push('女方收入略低于男方预期')
    }
  }

  if (male.net_worth_range && female.intention?.preferred_net_worth_min) {
    notes.push('已纳入高净值偏好比较')
  }

  return { score: Math.max(0, score), notes }
}

function scoreLifestyle(male: ProfileWithIntention, female: ProfileWithIntention) {
  let score = 7
  const notes: string[] = []

  const maleHobbies = new Set(ensureStringArray(male.hobbies))
  const femaleHobbies = new Set(ensureStringArray(female.hobbies))
  const commonHobbies = [...maleHobbies].filter((item) => femaleHobbies.has(item))
  if (commonHobbies.length) {
    score += Math.min(4, commonHobbies.length * 2)
    notes.push(`共同兴趣：${commonHobbies.join('、')}`)
  }

  if (male.traitProfile?.sleep_schedule && female.traitProfile?.sleep_schedule) {
    if (male.traitProfile.sleep_schedule === female.traitProfile.sleep_schedule) {
      score += 2
    }
  }

  if (male.traitProfile?.social_preference && female.traitProfile?.social_preference) {
    if (male.traitProfile.social_preference === female.traitProfile.social_preference) {
      score += 2
    }
  }

  return { score: Math.min(15, score), notes }
}

function scoreRelationshipStyle(male: ProfileWithIntention, female: ProfileWithIntention, pendingFields: string[]) {
  let score = 6
  const notes: string[] = []

  if (!male.intention?.communication_style || !female.intention?.communication_style) {
    pendingFields.push('沟通风格待确认')
  } else if (male.intention.communication_style === female.intention.communication_style) {
    score += 2
  }

  if (!male.intention?.relationship_pace || !female.intention?.relationship_pace) {
    pendingFields.push('推进节奏待确认')
  } else if (male.intention.relationship_pace === female.intention.relationship_pace) {
    score += 2
  }

  if (!male.traitProfile?.emotional_stability || !female.traitProfile?.emotional_stability) {
    pendingFields.push('情绪稳定待确认')
  } else if (male.traitProfile.emotional_stability === female.traitProfile.emotional_stability) {
    score += 2
  }

  return { score: Math.min(10, score), notes }
}

export function calculateMatchScore(male: ProfileWithIntention, female: ProfileWithIntention): MatchEvaluation {
  const hardConflicts: string[] = []
  const pendingFields: string[] = []
  const directionalNotes: string[] = []

  const intent = scoreIntentStage(male, female)
  directionalNotes.push(...intent.notes)

  const city = scoreCityMobility(male, female, hardConflicts, pendingFields)
  directionalNotes.push(...city.notes)

  const marriageChildren = scoreMarriageChildren(male, female, hardConflicts, pendingFields)
  directionalNotes.push(...marriageChildren.notes)

  const economics = scoreEconomics(male, female, hardConflicts)
  directionalNotes.push(...economics.notes)

  const lifestyle = scoreLifestyle(male, female)
  directionalNotes.push(...lifestyle.notes)

  const relationshipStyle = scoreRelationshipStyle(male, female, pendingFields)
  directionalNotes.push(...relationshipStyle.notes)

  const modeAcceptance = resolveModeAcceptance(female, male)
  const pendingReasons: string[] = []
  const requiredFollowupFields: string[] = []
  const suggestedFollowupQuestions: string[] = []

  let recommendationType: MatchEvaluation['recommendationType'] = 'confirmed'
  let sensitiveModeScore = 10

  if (modeAcceptance.state === 'no') {
    recommendationType = 'rejected'
    hardConflicts.push(modeAcceptance.fieldLabel ?? '敏感模式明确不接受')
    sensitiveModeScore = 0
  } else if (modeAcceptance.state === 'unknown') {
    recommendationType = 'pending_confirmation'
    sensitiveModeScore = 5
    if (modeAcceptance.fieldKey) {
      requiredFollowupFields.push(modeAcceptance.fieldKey)
    }
    if (modeAcceptance.fieldLabel) {
      pendingFields.push(modeAcceptance.fieldLabel)
      pendingReasons.push(`${modeAcceptance.fieldLabel} 尚未确认`)
      suggestedFollowupQuestions.push(buildFollowupQuestion(modeAcceptance.fieldKey))
    }
  }

  const rawTotal =
    intent.score
    + city.score
    + marriageChildren.score
    + economics.score
    + lifestyle.score
    + relationshipStyle.score
    + sensitiveModeScore

  const total = Math.round((Math.max(0, rawTotal) / RAW_SCORE_MAX) * 100)

  if (hardConflicts.length) {
    recommendationType = 'rejected'
  }

  const breakdown: ScoreBreakdown = {
    intent_stage: intent.score,
    city_mobility: city.score,
    marriage_children: marriageChildren.score,
    economics: economics.score,
    lifestyle: lifestyle.score,
    relationship_style: relationshipStyle.score,
    sensitive_mode: sensitiveModeScore,
    hard_conflicts: Array.from(new Set(hardConflicts)),
    pending_fields: Array.from(new Set(pendingFields)),
    directional_notes: Array.from(new Set(directionalNotes.filter(Boolean))),
  }

  return {
    total,
    breakdown,
    recommendationType,
    qualifies: total >= 60 && recommendationType !== 'rejected',
    hardConflicts: breakdown.hard_conflicts,
    pendingFields: breakdown.pending_fields,
    pendingReasons: Array.from(new Set(pendingReasons)),
    requiredFollowupFields: Array.from(new Set(requiredFollowupFields)),
    suggestedFollowupQuestions: Array.from(new Set(suggestedFollowupQuestions.filter(Boolean))),
  }
}

function buildFollowupQuestion(fieldKey: string | null) {
  switch (fieldKey) {
    case 'relationship_mode':
      return '你现在更明确是奔着结婚，还是恋爱带经济安排，还是生育资产安排这类模式？'
    case 'accepts_mode_compensated_dating':
      return '如果对方是带明确经济支持安排的恋爱关系，你能接受吗？'
    case 'accepts_mode_fertility_asset_arrangement':
      return '如果对方是以生育和资产安排为核心的关系模式，你会考虑吗？'
    case 'accepts_mode_marriage_standard':
      return '你现在是只考虑奔着结婚去的正式关系吗？'
    default:
      return '这个关键边界你更倾向明确接受、明确不接受，还是暂时还没想好？'
  }
}
