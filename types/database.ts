export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type GenderType = 'male' | 'female'
export type ProfileStatus = 'active' | 'inactive' | 'matched' | 'paused'
export type EducationLevel = 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd' | 'other'
export type PrimaryIntent = 'marriage' | 'dating' | 'fertility'
export type RelationshipMode =
  | 'marriage_standard'
  | 'compensated_dating'
  | 'fertility_asset_arrangement'
export type TriState = 'yes' | 'no' | 'unknown'
export type ConversationStatus = 'pending' | 'transcribing' | 'extracting' | 'done' | 'failed'
export type MatchStatus =
  | 'pending'
  | 'reviewing'
  | 'contacted_male'
  | 'contacted_female'
  | 'both_agreed'
  | 'meeting_scheduled'
  | 'met'
  | 'succeeded'
  | 'failed'
  | 'dismissed'
export type RecommendationType = 'confirmed' | 'pending_confirmation' | 'rejected'
export type ReminderType =
  | 'no_followup'
  | 'no_new_info'
  | 'meeting_reminder'
  | 'pending_confirmation'
export type UserRole = 'admin' | 'matchmaker'
export type FollowupTaskType =
  | 'missing_field'
  | 'sensitive_confirmation'
  | 'verification'
  | 'relationship_followup'
export type FollowupTaskStatus = 'open' | 'in_progress' | 'done' | 'dismissed'
export type ImportanceLevel = 'hard' | 'important' | 'normal' | 'flexible'
export type TaskPriority = 'high' | 'medium' | 'low'
export type FieldObservationSourceType =
  | 'self_reported'
  | 'matchmaker_summary'
  | 'ai_extracted'
  | 'verified_document'
export type FieldVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: {
          user_id: string
          role: UserRole
          display_name: string
          created_at: string
        }
        Insert: {
          user_id: string
          role: UserRole
          display_name: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: UserRole
          display_name?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          matchmaker_id: string
          auth_user_id: string | null
          gender: GenderType
          status: ProfileStatus
          name: string
          phone: string | null
          nationality: string | null
          citizenship_list: string[] | null
          languages: string[] | null
          age: number | null
          height: number | null
          weight: number | null
          hometown: string | null
          city: string | null
          current_base_cities: string[] | null
          residency_status: string | null
          visa_flexibility: string | null
          travel_frequency: string | null
          time_zone_pattern: string | null
          education: EducationLevel | null
          school_notes: string | null
          occupation: string | null
          job_title: string | null
          industry: string | null
          work_intensity: string | null
          work_schedule: string | null
          annual_income: number | null
          income_range: string | null
          net_worth_range: string | null
          liquid_assets_range: string | null
          assets: string | null
          property_locations: string[] | null
          support_budget_range: string | null
          income_verified: boolean | null
          assets_verified: boolean | null
          appearance_score: number | null
          photo_urls: string[] | null
          marital_history: string | null
          marital_history_verified: boolean | null
          has_children: boolean | null
          children_notes: string | null
          hobbies: string[] | null
          interest_tags: string[] | null
          cultural_preferences: string[] | null
          travel_style_tags: string[] | null
          social_scene_tags: string[] | null
          lifestyle_tags: string[] | null
          personality_tags: string[] | null
          smoking: boolean | null
          drinking: boolean | null
          family_burden_notes: string | null
          parental_involvement: string | null
          seriousness_score: number | null
          followup_strategy: string | null
          hidden_expectations: string | null
          ai_summary: string | null
          raw_notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          matchmaker_id: string
          auth_user_id?: string | null
          gender: GenderType
          status?: ProfileStatus
          name: string
          phone?: string | null
          nationality?: string | null
          citizenship_list?: string[] | null
          languages?: string[] | null
          age?: number | null
          height?: number | null
          weight?: number | null
          hometown?: string | null
          city?: string | null
          current_base_cities?: string[] | null
          residency_status?: string | null
          visa_flexibility?: string | null
          travel_frequency?: string | null
          time_zone_pattern?: string | null
          education?: EducationLevel | null
          school_notes?: string | null
          occupation?: string | null
          job_title?: string | null
          industry?: string | null
          work_intensity?: string | null
          work_schedule?: string | null
          annual_income?: number | null
          income_range?: string | null
          net_worth_range?: string | null
          liquid_assets_range?: string | null
          assets?: string | null
          property_locations?: string[] | null
          support_budget_range?: string | null
          income_verified?: boolean | null
          assets_verified?: boolean | null
          appearance_score?: number | null
          photo_urls?: string[] | null
          marital_history?: string | null
          marital_history_verified?: boolean | null
          has_children?: boolean | null
          children_notes?: string | null
          hobbies?: string[] | null
          interest_tags?: string[] | null
          cultural_preferences?: string[] | null
          travel_style_tags?: string[] | null
          social_scene_tags?: string[] | null
          lifestyle_tags?: string[] | null
          personality_tags?: string[] | null
          smoking?: boolean | null
          drinking?: boolean | null
          family_burden_notes?: string | null
          parental_involvement?: string | null
          seriousness_score?: number | null
          followup_strategy?: string | null
          hidden_expectations?: string | null
          ai_summary?: string | null
          raw_notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          matchmaker_id?: string
          auth_user_id?: string | null
          gender?: GenderType
          status?: ProfileStatus
          name?: string
          phone?: string | null
          nationality?: string | null
          citizenship_list?: string[] | null
          languages?: string[] | null
          age?: number | null
          height?: number | null
          weight?: number | null
          hometown?: string | null
          city?: string | null
          current_base_cities?: string[] | null
          residency_status?: string | null
          visa_flexibility?: string | null
          travel_frequency?: string | null
          time_zone_pattern?: string | null
          education?: EducationLevel | null
          school_notes?: string | null
          occupation?: string | null
          job_title?: string | null
          industry?: string | null
          work_intensity?: string | null
          work_schedule?: string | null
          annual_income?: number | null
          income_range?: string | null
          net_worth_range?: string | null
          liquid_assets_range?: string | null
          assets?: string | null
          property_locations?: string[] | null
          support_budget_range?: string | null
          income_verified?: boolean | null
          assets_verified?: boolean | null
          appearance_score?: number | null
          photo_urls?: string[] | null
          marital_history?: string | null
          marital_history_verified?: boolean | null
          has_children?: boolean | null
          children_notes?: string | null
          hobbies?: string[] | null
          interest_tags?: string[] | null
          cultural_preferences?: string[] | null
          travel_style_tags?: string[] | null
          social_scene_tags?: string[] | null
          lifestyle_tags?: string[] | null
          personality_tags?: string[] | null
          smoking?: boolean | null
          drinking?: boolean | null
          family_burden_notes?: string | null
          parental_involvement?: string | null
          seriousness_score?: number | null
          followup_strategy?: string | null
          hidden_expectations?: string | null
          ai_summary?: string | null
          raw_notes?: string | null
        }
        Relationships: []
      }
      intentions: {
        Row: {
          id: string
          profile_id: string
          updated_at: string
          primary_intent: PrimaryIntent | null
          intent_notes: string | null
          relationship_mode: RelationshipMode | null
          relationship_mode_notes: string | null
          accepts_mode_marriage_standard: TriState
          accepts_mode_compensated_dating: TriState
          accepts_mode_fertility_asset_arrangement: TriState
          mode_boundary_notes: string | null
          financial_arrangement_expectation: string | null
          financial_arrangement_boundary: string | null
          exclusive_relationship_requirement: string | null
          fertility_preference: string | null
          fertility_timeline: string | null
          desired_children_count: number | null
          biological_child_requirement: boolean | null
          co_parenting_expectation: string | null
          child_support_expectation: string | null
          inheritance_expectation: string | null
          prenup_acceptance: TriState
          preferred_age_min: number | null
          preferred_age_max: number | null
          preferred_height_min: number | null
          preferred_cities: string[] | null
          settle_city_preferences: string[] | null
          accepts_long_distance: TriState
          relocation_willingness: TriState
          preferred_education: EducationLevel[] | null
          preferred_income_min: number | null
          preferred_net_worth_min: string | null
          preferred_industry_tags: string[] | null
          dealbreakers: string[] | null
          tolerance_notes: string | null
          acceptable_conditions: string[] | null
          long_distance_notes: string | null
          accepts_partner_marital_history: string[] | null
          accepts_partner_children: TriState
          relationship_pace: string | null
          communication_style: string | null
          biggest_concerns: string[] | null
          implicit_intent_notes: string | null
          preference_importance: Json | null
        }
        Insert: {
          id?: string
          profile_id: string
          updated_at?: string
          primary_intent?: PrimaryIntent | null
          intent_notes?: string | null
          relationship_mode?: RelationshipMode | null
          relationship_mode_notes?: string | null
          accepts_mode_marriage_standard?: TriState
          accepts_mode_compensated_dating?: TriState
          accepts_mode_fertility_asset_arrangement?: TriState
          mode_boundary_notes?: string | null
          financial_arrangement_expectation?: string | null
          financial_arrangement_boundary?: string | null
          exclusive_relationship_requirement?: string | null
          fertility_preference?: string | null
          fertility_timeline?: string | null
          desired_children_count?: number | null
          biological_child_requirement?: boolean | null
          co_parenting_expectation?: string | null
          child_support_expectation?: string | null
          inheritance_expectation?: string | null
          prenup_acceptance?: TriState
          preferred_age_min?: number | null
          preferred_age_max?: number | null
          preferred_height_min?: number | null
          preferred_cities?: string[] | null
          settle_city_preferences?: string[] | null
          accepts_long_distance?: TriState
          relocation_willingness?: TriState
          preferred_education?: EducationLevel[] | null
          preferred_income_min?: number | null
          preferred_net_worth_min?: string | null
          preferred_industry_tags?: string[] | null
          dealbreakers?: string[] | null
          tolerance_notes?: string | null
          acceptable_conditions?: string[] | null
          long_distance_notes?: string | null
          accepts_partner_marital_history?: string[] | null
          accepts_partner_children?: TriState
          relationship_pace?: string | null
          communication_style?: string | null
          biggest_concerns?: string[] | null
          implicit_intent_notes?: string | null
          preference_importance?: Json | null
        }
        Update: {
          id?: string
          profile_id?: string
          updated_at?: string
          primary_intent?: PrimaryIntent | null
          intent_notes?: string | null
          relationship_mode?: RelationshipMode | null
          relationship_mode_notes?: string | null
          accepts_mode_marriage_standard?: TriState
          accepts_mode_compensated_dating?: TriState
          accepts_mode_fertility_asset_arrangement?: TriState
          mode_boundary_notes?: string | null
          financial_arrangement_expectation?: string | null
          financial_arrangement_boundary?: string | null
          exclusive_relationship_requirement?: string | null
          fertility_preference?: string | null
          fertility_timeline?: string | null
          desired_children_count?: number | null
          biological_child_requirement?: boolean | null
          co_parenting_expectation?: string | null
          child_support_expectation?: string | null
          inheritance_expectation?: string | null
          prenup_acceptance?: TriState
          preferred_age_min?: number | null
          preferred_age_max?: number | null
          preferred_height_min?: number | null
          preferred_cities?: string[] | null
          settle_city_preferences?: string[] | null
          accepts_long_distance?: TriState
          relocation_willingness?: TriState
          preferred_education?: EducationLevel[] | null
          preferred_income_min?: number | null
          preferred_net_worth_min?: string | null
          preferred_industry_tags?: string[] | null
          dealbreakers?: string[] | null
          tolerance_notes?: string | null
          acceptable_conditions?: string[] | null
          long_distance_notes?: string | null
          accepts_partner_marital_history?: string[] | null
          accepts_partner_children?: TriState
          relationship_pace?: string | null
          communication_style?: string | null
          biggest_concerns?: string[] | null
          implicit_intent_notes?: string | null
          preference_importance?: Json | null
        }
        Relationships: []
      }
      trait_profiles: {
        Row: {
          id: string
          profile_id: string
          updated_at: string
          hobby_ranked_tags: string[] | null
          exercise_habits: string | null
          diet_habits: string | null
          sleep_schedule: string | null
          smoking_habit: string | null
          drinking_habit: string | null
          social_preference: string | null
          spending_style: string | null
          emotional_stability: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          updated_at?: string
          hobby_ranked_tags?: string[] | null
          exercise_habits?: string | null
          diet_habits?: string | null
          sleep_schedule?: string | null
          smoking_habit?: string | null
          drinking_habit?: string | null
          social_preference?: string | null
          spending_style?: string | null
          emotional_stability?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          updated_at?: string
          hobby_ranked_tags?: string[] | null
          exercise_habits?: string | null
          diet_habits?: string | null
          sleep_schedule?: string | null
          smoking_habit?: string | null
          drinking_habit?: string | null
          social_preference?: string | null
          spending_style?: string | null
          emotional_stability?: string | null
        }
        Relationships: []
      }
      field_observations: {
        Row: {
          id: string
          profile_id: string
          conversation_id: string
          field_key: string
          field_value_json: Json | null
          source_type: FieldObservationSourceType
          confidence: number
          verification_status: FieldVerificationStatus
          evidence_text: string | null
          start_time_seconds: number | null
          end_time_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          conversation_id: string
          field_key: string
          field_value_json?: Json | null
          source_type?: FieldObservationSourceType
          confidence?: number
          verification_status?: FieldVerificationStatus
          evidence_text?: string | null
          start_time_seconds?: number | null
          end_time_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          conversation_id?: string
          field_key?: string
          field_value_json?: Json | null
          source_type?: FieldObservationSourceType
          confidence?: number
          verification_status?: FieldVerificationStatus
          evidence_text?: string | null
          start_time_seconds?: number | null
          end_time_seconds?: number | null
          created_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          talked_at: string | null
          profile_id: string
          matchmaker_id: string
          audio_url: string | null
          audio_duration: number | null
          status: ConversationStatus
          error_message: string | null
          transcript: string | null
          transcript_verbose_json: Json | null
          extracted_fields: Json | null
          extraction_notes: string | null
          missing_fields: string[] | null
          suggested_questions: string[] | null
          reviewed_by: string | null
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          talked_at?: string | null
          profile_id: string
          matchmaker_id: string
          audio_url?: string | null
          audio_duration?: number | null
          status?: ConversationStatus
          error_message?: string | null
          transcript?: string | null
          transcript_verbose_json?: Json | null
          extracted_fields?: Json | null
          extraction_notes?: string | null
          missing_fields?: string[] | null
          suggested_questions?: string[] | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          talked_at?: string | null
          profile_id?: string
          matchmaker_id?: string
          audio_url?: string | null
          audio_duration?: number | null
          status?: ConversationStatus
          error_message?: string | null
          transcript?: string | null
          transcript_verbose_json?: Json | null
          extracted_fields?: Json | null
          extraction_notes?: string | null
          missing_fields?: string[] | null
          suggested_questions?: string[] | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          male_profile_id: string
          female_profile_id: string
          matchmaker_id: string
          match_score: number
          score_breakdown: Json | null
          match_reason: string | null
          recommendation_type: RecommendationType
          pending_reasons: string[] | null
          required_followup_fields: string[] | null
          suggested_followup_questions: string[] | null
          status: MatchStatus
          matchmaker_notes: string | null
          meeting_time: string | null
          meeting_location: string | null
          outcome_notes: string | null
          dismissed_reason: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          male_profile_id: string
          female_profile_id: string
          matchmaker_id: string
          match_score: number
          score_breakdown?: Json | null
          match_reason?: string | null
          recommendation_type?: RecommendationType
          pending_reasons?: string[] | null
          required_followup_fields?: string[] | null
          suggested_followup_questions?: string[] | null
          status?: MatchStatus
          matchmaker_notes?: string | null
          meeting_time?: string | null
          meeting_location?: string | null
          outcome_notes?: string | null
          dismissed_reason?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          male_profile_id?: string
          female_profile_id?: string
          matchmaker_id?: string
          match_score?: number
          score_breakdown?: Json | null
          match_reason?: string | null
          recommendation_type?: RecommendationType
          pending_reasons?: string[] | null
          required_followup_fields?: string[] | null
          suggested_followup_questions?: string[] | null
          status?: MatchStatus
          matchmaker_notes?: string | null
          meeting_time?: string | null
          meeting_location?: string | null
          outcome_notes?: string | null
          dismissed_reason?: string | null
        }
        Relationships: []
      }
      followup_tasks: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          profile_id: string | null
          match_id: string | null
          matchmaker_id: string
          task_type: FollowupTaskType
          priority: TaskPriority
          field_keys: string[] | null
          question_list: string[] | null
          rationale: string | null
          status: FollowupTaskStatus
          completed_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          profile_id?: string | null
          match_id?: string | null
          matchmaker_id: string
          task_type: FollowupTaskType
          priority?: TaskPriority
          field_keys?: string[] | null
          question_list?: string[] | null
          rationale?: string | null
          status?: FollowupTaskStatus
          completed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          profile_id?: string | null
          match_id?: string | null
          matchmaker_id?: string
          task_type?: FollowupTaskType
          priority?: TaskPriority
          field_keys?: string[] | null
          question_list?: string[] | null
          rationale?: string | null
          status?: FollowupTaskStatus
          completed_at?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          created_at: string
          matchmaker_id: string
          profile_id: string | null
          match_id: string | null
          type: ReminderType
          message: string
          is_read: boolean
          read_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          matchmaker_id: string
          profile_id?: string | null
          match_id?: string | null
          type: ReminderType
          message: string
          is_read?: boolean
          read_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          matchmaker_id?: string
          profile_id?: string | null
          match_id?: string | null
          type?: ReminderType
          message?: string
          is_read?: boolean
          read_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string | null
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      gender_type: GenderType
      profile_status: ProfileStatus
      education_level: EducationLevel
      primary_intent: PrimaryIntent
      relationship_mode: RelationshipMode
      tri_state: TriState
      conversation_status: ConversationStatus
      match_status: MatchStatus
      recommendation_type: RecommendationType
      reminder_type: ReminderType
      user_role: UserRole
      followup_task_type: FollowupTaskType
      followup_task_status: FollowupTaskStatus
      importance_level: ImportanceLevel
      task_priority: TaskPriority
      field_observation_source_type: FieldObservationSourceType
      field_verification_status: FieldVerificationStatus
    }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Intention = Database['public']['Tables']['intentions']['Row']
export type IntentionInsert = Database['public']['Tables']['intentions']['Insert']
export type IntentionUpdate = Database['public']['Tables']['intentions']['Update']

export type TraitProfile = Database['public']['Tables']['trait_profiles']['Row']
export type TraitProfileInsert = Database['public']['Tables']['trait_profiles']['Insert']
export type TraitProfileUpdate = Database['public']['Tables']['trait_profiles']['Update']

export type FieldObservation = Database['public']['Tables']['field_observations']['Row']
export type FieldObservationInsert = Database['public']['Tables']['field_observations']['Insert']
export type FieldObservationUpdate = Database['public']['Tables']['field_observations']['Update']

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export type Match = Database['public']['Tables']['matches']['Row']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']
export type MatchUpdate = Database['public']['Tables']['matches']['Update']

export type FollowupTask = Database['public']['Tables']['followup_tasks']['Row']
export type FollowupTaskInsert = Database['public']['Tables']['followup_tasks']['Insert']
export type FollowupTaskUpdate = Database['public']['Tables']['followup_tasks']['Update']

export type Reminder = Database['public']['Tables']['reminders']['Row']
export type ReminderInsert = Database['public']['Tables']['reminders']['Insert']
export type ReminderUpdate = Database['public']['Tables']['reminders']['Update']

export type UserRoleRow = Database['public']['Tables']['user_roles']['Row']
export type UserRoleInsert = Database['public']['Tables']['user_roles']['Insert']
export type UserRoleUpdate = Database['public']['Tables']['user_roles']['Update']
