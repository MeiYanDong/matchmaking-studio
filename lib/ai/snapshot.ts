import { Conversation, Intention, Profile, TraitProfile } from '@/types/database'
import { V1_FIELD_KEYS, type V1FieldKey } from '@/lib/ai/field-spec'

export type CurrentProfileContext = {
  profile: Profile
  intention: Intention | null
  traitProfile: TraitProfile | null
  conversation?: Pick<Conversation, 'talked_at' | 'created_at'> | null
}

export type CurrentProfileSnapshot = Record<V1FieldKey, unknown>

export function buildCurrentProfileSnapshot({
  profile,
  intention,
  traitProfile,
  conversation,
}: CurrentProfileContext): CurrentProfileSnapshot {
  const snapshot = {} as CurrentProfileSnapshot

  for (const key of V1_FIELD_KEYS) {
    snapshot[key] = null
  }

  snapshot.talked_at = conversation?.talked_at ?? conversation?.created_at ?? null

  snapshot.name = profile.name
  snapshot.phone = profile.phone
  snapshot.nationality = profile.nationality
  snapshot.languages = profile.languages
  snapshot.age = profile.age
  snapshot.city = profile.city
  snapshot.current_base_cities = profile.current_base_cities
  snapshot.residency_status = profile.residency_status
  snapshot.travel_frequency = profile.travel_frequency
  snapshot.education = profile.education
  snapshot.occupation = profile.occupation
  snapshot.work_schedule = profile.work_schedule
  snapshot.annual_income = profile.annual_income
  snapshot.net_worth_range = profile.net_worth_range
  snapshot.assets = profile.assets
  snapshot.support_budget_range = profile.support_budget_range
  snapshot.marital_history = profile.marital_history
  snapshot.has_children = profile.has_children
  snapshot.children_notes = profile.children_notes
  snapshot.hobbies = profile.hobbies
  snapshot.hidden_expectations = profile.hidden_expectations
  snapshot.followup_strategy = profile.followup_strategy
  snapshot.ai_summary = profile.ai_summary

  snapshot.primary_intent = intention?.primary_intent ?? null
  snapshot.relationship_mode = intention?.relationship_mode ?? null
  snapshot.accepts_mode_marriage_standard = intention?.accepts_mode_marriage_standard ?? 'unknown'
  snapshot.accepts_mode_compensated_dating = intention?.accepts_mode_compensated_dating ?? 'unknown'
  snapshot.accepts_mode_fertility_asset_arrangement =
    intention?.accepts_mode_fertility_asset_arrangement ?? 'unknown'
  snapshot.preferred_age_min = intention?.preferred_age_min ?? null
  snapshot.preferred_age_max = intention?.preferred_age_max ?? null
  snapshot.preferred_cities = intention?.preferred_cities ?? null
  snapshot.accepts_long_distance = intention?.accepts_long_distance ?? 'unknown'
  snapshot.relocation_willingness = intention?.relocation_willingness ?? 'unknown'
  snapshot.preferred_education = intention?.preferred_education ?? null
  snapshot.preferred_income_min = intention?.preferred_income_min ?? null
  snapshot.accepts_partner_marital_history = intention?.accepts_partner_marital_history ?? null
  snapshot.accepts_partner_children = intention?.accepts_partner_children ?? 'unknown'
  snapshot.fertility_preference = intention?.fertility_preference ?? null
  snapshot.dealbreakers = intention?.dealbreakers ?? null
  snapshot.preference_importance = intention?.preference_importance ?? null
  snapshot.communication_style = intention?.communication_style ?? null
  snapshot.relationship_pace = intention?.relationship_pace ?? null
  snapshot.biggest_concerns = intention?.biggest_concerns ?? null

  snapshot.exercise_habits = traitProfile?.exercise_habits ?? null
  snapshot.diet_habits = traitProfile?.diet_habits ?? null
  snapshot.sleep_schedule = traitProfile?.sleep_schedule ?? null
  snapshot.smoking_habit = traitProfile?.smoking_habit ?? null
  snapshot.drinking_habit = traitProfile?.drinking_habit ?? null
  snapshot.social_preference = traitProfile?.social_preference ?? null
  snapshot.spending_style = traitProfile?.spending_style ?? null
  snapshot.emotional_stability = traitProfile?.emotional_stability ?? null

  return snapshot
}
