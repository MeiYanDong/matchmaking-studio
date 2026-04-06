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
  snapshot.height_cm = profile.height_cm ?? profile.height
  snapshot.current_city = profile.current_city ?? profile.city
  snapshot.current_base_cities = profile.current_base_cities
  snapshot.residency_status = profile.residency_status
  snapshot.travel_frequency = profile.travel_frequency
  snapshot.education_level_v2 = (profile.education_level_v2 ?? profile.education) as typeof profile.education_level_v2
  snapshot.occupation = profile.occupation
  snapshot.work_schedule = profile.work_schedule
  snapshot.monthly_income = profile.monthly_income ?? (profile.annual_income ? Math.round(profile.annual_income / 12 * 100) / 100 : null)
  snapshot.net_worth_range = profile.net_worth_range
  snapshot.assets = profile.assets
  snapshot.support_budget_range = profile.support_budget_range
  snapshot.marital_history_enum = (profile.marital_history_enum ?? profile.marital_history) as typeof profile.marital_history_enum
  snapshot.has_children_enum = profile.has_children_enum ?? (profile.has_children === true ? 'yes' : profile.has_children === false ? 'no' : null)
  snapshot.children_notes = profile.children_notes
  snapshot.children_age_notes = profile.children_age_notes
  snapshot.birth_year_month = profile.birth_year_month
  snapshot.bachelor_school = profile.bachelor_school
  snapshot.master_school = profile.master_school
  snapshot.major = profile.major
  snapshot.company_name = profile.company_name
  snapshot.smokes = (profile.smokes ?? (profile.smoking === true ? 'yes' : profile.smoking === false ? 'no' : null)) as typeof profile.smokes
  snapshot.drinks = (profile.drinks ?? (profile.drinking === true ? 'yes' : profile.drinking === false ? 'no' : null)) as typeof profile.drinks
  snapshot.urgency_level = profile.urgency_level
  snapshot.mbti = profile.mbti
  snapshot.vehicle_brand = profile.vehicle_brand
  snapshot.property_notes = profile.property_notes
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
