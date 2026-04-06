import { getFieldDisplayLabel } from '@/lib/ai/field-presentation'

export const MANUAL_ONLY_V1_FOLLOWUP_FIELD_KEYS = new Set([
  'relationship_mode',
  'accepts_mode_compensated_dating',
  'accepts_mode_fertility_asset_arrangement',
])

const CANONICAL_QUESTION_BY_FIELD_KEY: Record<string, string> = {
  relationship_mode: '你现在更明确是奔着结婚，还是恋爱带经济安排，还是生育资产安排这类模式？',
  marital_history: '你之前有过婚史吗，还是一直未婚？',
  marital_history_enum: '你之前有过婚史吗，还是一直未婚？',
  has_children: '你自己目前有孩子吗？',
  has_children_enum: '你自己目前有孩子吗？',
  accepts_partner_children: '对方如果有孩子，你这边能接受吗？',
  accepts_partner_marital_history: '你能接受对方有过婚史吗？离异的可以考虑吗？',
  fertility_preference: '你自己未来有没有想生孩子的打算？',
  accepts_mode_marriage_standard: '你现在是只考虑奔着结婚去的正式关系吗？',
  accepts_mode_compensated_dating: '如果对方是恋爱关系里带明确经济安排，你能接受吗？',
  accepts_mode_fertility_asset_arrangement: '如果对方是以生育和资产安排为核心的关系模式，你会考虑吗？',
}

const FIELD_QUESTION_PATTERNS: Array<{ fieldKey: string; patterns: RegExp[] }> = [
  {
    fieldKey: 'relationship_mode',
    patterns: [/奔着结婚/, /经济安排/, /生育.*资产安排/, /关系模式/],
  },
  {
    fieldKey: 'marital_history_enum',
    patterns: [/婚史/, /未婚/, /结过婚/, /离异/],
  },
  {
    fieldKey: 'has_children_enum',
    patterns: [/自己.*有孩子/, /^有孩子吗/, /目前有孩子/],
  },
  {
    fieldKey: 'accepts_partner_children',
    patterns: [/对方.*有孩子/, /离异带孩子/, /带孩子.*接受/, /接受.*对方.*孩子/],
  },
  {
    fieldKey: 'accepts_partner_marital_history',
    patterns: [/对方.*婚史/, /接受.*婚史/, /离异.*可以考虑/, /有过婚史.*接受/],
  },
  {
    fieldKey: 'fertility_preference',
    patterns: [/想生孩子/, /想要孩子/, /未来.*孩子/, /以后.*孩子/, /想过.*孩子/, /生孩子.*打算/, /生育意愿/],
  },
  {
    fieldKey: 'accepts_mode_marriage_standard',
    patterns: [/正式关系/, /只考虑.*结婚/],
  },
  {
    fieldKey: 'accepts_mode_compensated_dating',
    patterns: [/经济安排/, /经济支持/, /恋爱关系.*安排/],
  },
  {
    fieldKey: 'accepts_mode_fertility_asset_arrangement',
    patterns: [/生育.*资产安排/, /资产安排.*核心/],
  },
]

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function normalizeQuestionFingerprint(question: string) {
  return question
    .replace(/[，。！？、,.!?：:；;"'（）()\[\]【】]/g, '')
    .replace(/\s+/g, '')
    .replace(/^你自己/, '')
    .replace(/^你这边/, '')
    .replace(/^你/, '')
    .replace(/^如果/, '')
    .replace(/的话/g, '')
    .replace(/还是一直是/g, '还是一直')
    .toLowerCase()
}

function matchFieldKeyByQuestion(question: string) {
  return FIELD_QUESTION_PATTERNS.find(({ patterns }) => patterns.some((pattern) => pattern.test(question)))?.fieldKey ?? null
}

export function classifyFollowupQuestion(question: string) {
  return matchFieldKeyByQuestion(question)
}

export function dedupeFieldKeysByDisplay(fieldKeys: string[]) {
  const seenLabels = new Set<string>()
  const result: string[] = []

  for (const fieldKey of uniqueStrings(fieldKeys)) {
    const label = getFieldDisplayLabel(fieldKey).trim()
    if (!label || seenLabels.has(label)) continue
    seenLabels.add(label)
    result.push(fieldKey)
  }

  return result
}

export function buildDisplayFollowupQuestions(fieldKeys: string[], questions: string[]) {
  const dedupedFieldKeys = dedupeFieldKeysByDisplay(fieldKeys)
  const canonicalQuestions = dedupedFieldKeys
    .map((fieldKey) => CANONICAL_QUESTION_BY_FIELD_KEY[fieldKey])
    .filter(Boolean)

  const canonicalFieldKeys = new Set(
    dedupedFieldKeys.filter((fieldKey) => Boolean(CANONICAL_QUESTION_BY_FIELD_KEY[fieldKey]))
  )

  const seenFingerprints = new Set(canonicalQuestions.map(normalizeQuestionFingerprint))
  const displayQuestions = [...canonicalQuestions]

  for (const question of uniqueStrings(questions)) {
    const matchedFieldKey = matchFieldKeyByQuestion(question)
    if (matchedFieldKey && canonicalFieldKeys.has(matchedFieldKey)) {
      continue
    }

    const fingerprint = normalizeQuestionFingerprint(question)
    if (!fingerprint || seenFingerprints.has(fingerprint)) continue

    seenFingerprints.add(fingerprint)
    displayQuestions.push(question)
  }

  return displayQuestions
}
