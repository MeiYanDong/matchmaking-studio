-- ============================================================
-- 婚恋匹配平台 - AI-first 字段系统与匹配重构
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_mode') THEN
    CREATE TYPE relationship_mode AS ENUM (
      'marriage_standard',
      'compensated_dating',
      'fertility_asset_arrangement'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tri_state') THEN
    CREATE TYPE tri_state AS ENUM ('yes', 'no', 'unknown');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_type') THEN
    CREATE TYPE recommendation_type AS ENUM ('confirmed', 'pending_confirmation', 'rejected');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'followup_task_type') THEN
    CREATE TYPE followup_task_type AS ENUM (
      'missing_field',
      'sensitive_confirmation',
      'verification',
      'relationship_followup'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'followup_task_status') THEN
    CREATE TYPE followup_task_status AS ENUM ('open', 'in_progress', 'done', 'dismissed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'importance_level') THEN
    CREATE TYPE importance_level AS ENUM ('hard', 'important', 'normal', 'flexible');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');
  END IF;
END $$;

ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'pending_confirmation';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS citizenship_list TEXT[],
  ADD COLUMN IF NOT EXISTS languages TEXT[],
  ADD COLUMN IF NOT EXISTS current_base_cities TEXT[],
  ADD COLUMN IF NOT EXISTS residency_status TEXT,
  ADD COLUMN IF NOT EXISTS visa_flexibility TEXT,
  ADD COLUMN IF NOT EXISTS travel_frequency TEXT,
  ADD COLUMN IF NOT EXISTS time_zone_pattern TEXT,
  ADD COLUMN IF NOT EXISTS school_notes TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS work_intensity TEXT,
  ADD COLUMN IF NOT EXISTS work_schedule TEXT,
  ADD COLUMN IF NOT EXISTS net_worth_range TEXT,
  ADD COLUMN IF NOT EXISTS liquid_assets_range TEXT,
  ADD COLUMN IF NOT EXISTS property_locations TEXT[],
  ADD COLUMN IF NOT EXISTS support_budget_range TEXT,
  ADD COLUMN IF NOT EXISTS income_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS assets_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS marital_history_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS interest_tags TEXT[],
  ADD COLUMN IF NOT EXISTS cultural_preferences TEXT[],
  ADD COLUMN IF NOT EXISTS travel_style_tags TEXT[],
  ADD COLUMN IF NOT EXISTS social_scene_tags TEXT[];

ALTER TABLE intentions
  ADD COLUMN IF NOT EXISTS relationship_mode relationship_mode,
  ADD COLUMN IF NOT EXISTS relationship_mode_notes TEXT,
  ADD COLUMN IF NOT EXISTS accepts_mode_marriage_standard tri_state DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS accepts_mode_compensated_dating tri_state DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS accepts_mode_fertility_asset_arrangement tri_state DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS mode_boundary_notes TEXT,
  ADD COLUMN IF NOT EXISTS financial_arrangement_expectation TEXT,
  ADD COLUMN IF NOT EXISTS financial_arrangement_boundary TEXT,
  ADD COLUMN IF NOT EXISTS exclusive_relationship_requirement TEXT,
  ADD COLUMN IF NOT EXISTS fertility_timeline TEXT,
  ADD COLUMN IF NOT EXISTS desired_children_count INTEGER,
  ADD COLUMN IF NOT EXISTS biological_child_requirement BOOLEAN,
  ADD COLUMN IF NOT EXISTS co_parenting_expectation TEXT,
  ADD COLUMN IF NOT EXISTS child_support_expectation TEXT,
  ADD COLUMN IF NOT EXISTS inheritance_expectation TEXT,
  ADD COLUMN IF NOT EXISTS prenup_acceptance tri_state DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS preferred_net_worth_min TEXT,
  ADD COLUMN IF NOT EXISTS preferred_industry_tags TEXT[],
  ADD COLUMN IF NOT EXISTS preference_importance JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'intentions'
      AND column_name = 'accepts_partner_children'
      AND udt_name = 'bool'
  ) THEN
    ALTER TABLE intentions
      ALTER COLUMN accepts_partner_children DROP DEFAULT,
      ALTER COLUMN accepts_partner_children TYPE tri_state
      USING (
        CASE
          WHEN accepts_partner_children IS TRUE THEN 'yes'::tri_state
          WHEN accepts_partner_children IS FALSE THEN 'no'::tri_state
          ELSE 'unknown'::tri_state
        END
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'intentions'
      AND column_name = 'accepts_long_distance'
      AND udt_name = 'bool'
  ) THEN
    ALTER TABLE intentions
      ALTER COLUMN accepts_long_distance DROP DEFAULT,
      ALTER COLUMN accepts_long_distance TYPE tri_state
      USING (
        CASE
          WHEN accepts_long_distance IS TRUE THEN 'yes'::tri_state
          WHEN accepts_long_distance IS FALSE THEN 'no'::tri_state
          ELSE 'unknown'::tri_state
        END
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'intentions'
      AND column_name = 'relocation_willingness'
      AND udt_name = 'bool'
  ) THEN
    ALTER TABLE intentions
      ALTER COLUMN relocation_willingness DROP DEFAULT,
      ALTER COLUMN relocation_willingness TYPE tri_state
      USING (
        CASE
          WHEN relocation_willingness IS TRUE THEN 'yes'::tri_state
          WHEN relocation_willingness IS FALSE THEN 'no'::tri_state
          ELSE 'unknown'::tri_state
        END
      );
  END IF;
END $$;

ALTER TABLE intentions
  ALTER COLUMN accepts_mode_marriage_standard SET DEFAULT 'unknown',
  ALTER COLUMN accepts_mode_compensated_dating SET DEFAULT 'unknown',
  ALTER COLUMN accepts_mode_fertility_asset_arrangement SET DEFAULT 'unknown',
  ALTER COLUMN accepts_partner_children SET DEFAULT 'unknown',
  ALTER COLUMN accepts_long_distance SET DEFAULT 'unknown',
  ALTER COLUMN relocation_willingness SET DEFAULT 'unknown',
  ALTER COLUMN prenup_acceptance SET DEFAULT 'unknown';

UPDATE intentions
SET
  accepts_mode_marriage_standard = COALESCE(accepts_mode_marriage_standard, 'unknown'),
  accepts_mode_compensated_dating = COALESCE(accepts_mode_compensated_dating, 'unknown'),
  accepts_mode_fertility_asset_arrangement = COALESCE(accepts_mode_fertility_asset_arrangement, 'unknown'),
  accepts_partner_children = COALESCE(accepts_partner_children, 'unknown'),
  accepts_long_distance = COALESCE(accepts_long_distance, 'unknown'),
  relocation_willingness = COALESCE(relocation_willingness, 'unknown'),
  prenup_acceptance = COALESCE(prenup_acceptance, 'unknown'),
  preference_importance = COALESCE(preference_importance, '{}'::jsonb);

CREATE TABLE IF NOT EXISTS trait_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hobby_ranked_tags TEXT[],
  exercise_habits TEXT,
  diet_habits TEXT,
  sleep_schedule TEXT,
  smoking_habit TEXT,
  drinking_habit TEXT,
  social_preference TEXT,
  spending_style TEXT,
  emotional_stability TEXT
);

DROP TRIGGER IF EXISTS trait_profiles_updated_at ON trait_profiles;
CREATE TRIGGER trait_profiles_updated_at
  BEFORE UPDATE ON trait_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO trait_profiles (
  profile_id,
  hobby_ranked_tags,
  smoking_habit,
  drinking_habit
)
SELECT
  p.id,
  p.hobbies,
  CASE
    WHEN p.smoking IS TRUE THEN '经常吸烟'
    WHEN p.smoking IS FALSE THEN '不吸烟'
    ELSE NULL
  END,
  CASE
    WHEN p.drinking IS TRUE THEN '偶尔饮酒'
    WHEN p.drinking IS FALSE THEN '不饮酒'
    ELSE NULL
  END
FROM profiles p
ON CONFLICT (profile_id) DO UPDATE
SET
  hobby_ranked_tags = COALESCE(trait_profiles.hobby_ranked_tags, EXCLUDED.hobby_ranked_tags),
  smoking_habit = COALESCE(trait_profiles.smoking_habit, EXCLUDED.smoking_habit),
  drinking_habit = COALESCE(trait_profiles.drinking_habit, EXCLUDED.drinking_habit);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS talked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transcript_verbose_json JSONB,
  ADD COLUMN IF NOT EXISTS missing_fields TEXT[],
  ADD COLUMN IF NOT EXISTS suggested_questions TEXT[];

UPDATE conversations
SET talked_at = created_at
WHERE talked_at IS NULL;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS recommendation_type recommendation_type DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS pending_reasons TEXT[],
  ADD COLUMN IF NOT EXISTS required_followup_fields TEXT[],
  ADD COLUMN IF NOT EXISTS suggested_followup_questions TEXT[];

UPDATE matches
SET recommendation_type = COALESCE(recommendation_type, 'confirmed');

CREATE TABLE IF NOT EXISTS followup_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  matchmaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type followup_task_type NOT NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  field_keys TEXT[],
  question_list TEXT[],
  rationale TEXT,
  status followup_task_status NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS followup_tasks_updated_at ON followup_tasks;
CREATE TRIGGER followup_tasks_updated_at
  BEFORE UPDATE ON followup_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_intentions_relationship_mode ON intentions(relationship_mode);
CREATE INDEX IF NOT EXISTS idx_intentions_accepts_mode_compensated_dating ON intentions(accepts_mode_compensated_dating);
CREATE INDEX IF NOT EXISTS idx_intentions_accepts_mode_fertility_arrangement ON intentions(accepts_mode_fertility_asset_arrangement);
CREATE INDEX IF NOT EXISTS idx_matches_recommendation_type ON matches(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_followup_tasks_matchmaker_status ON followup_tasks(matchmaker_id, status);
CREATE INDEX IF NOT EXISTS idx_followup_tasks_profile_id ON followup_tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_followup_tasks_match_id ON followup_tasks(match_id);

ALTER TABLE trait_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "红娘可以查看自己客户的画像" ON trait_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = trait_profiles.profile_id
        AND (profiles.matchmaker_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "红娘可以管理自己客户的画像" ON trait_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = trait_profiles.profile_id
        AND (profiles.matchmaker_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "红娘可以查看自己的补问任务" ON followup_tasks
  FOR SELECT USING (matchmaker_id = auth.uid() OR is_admin());

CREATE POLICY "系统可以创建补问任务" ON followup_tasks
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "红娘可以更新自己的补问任务" ON followup_tasks
  FOR UPDATE USING (matchmaker_id = auth.uid() OR is_admin());
