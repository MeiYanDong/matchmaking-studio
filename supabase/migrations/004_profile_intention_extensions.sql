-- ============================================================
-- Matchmaking Studio - 扩展档案与意图字段
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marital_history TEXT,
  ADD COLUMN IF NOT EXISTS has_children BOOLEAN,
  ADD COLUMN IF NOT EXISTS children_notes TEXT,
  ADD COLUMN IF NOT EXISTS lifestyle_tags TEXT[],
  ADD COLUMN IF NOT EXISTS personality_tags TEXT[],
  ADD COLUMN IF NOT EXISTS smoking BOOLEAN,
  ADD COLUMN IF NOT EXISTS drinking BOOLEAN,
  ADD COLUMN IF NOT EXISTS family_burden_notes TEXT,
  ADD COLUMN IF NOT EXISTS parental_involvement TEXT,
  ADD COLUMN IF NOT EXISTS seriousness_score INTEGER CHECK (seriousness_score >= 1 AND seriousness_score <= 10),
  ADD COLUMN IF NOT EXISTS followup_strategy TEXT,
  ADD COLUMN IF NOT EXISTS hidden_expectations TEXT;

ALTER TABLE intentions
  ADD COLUMN IF NOT EXISTS fertility_preference TEXT,
  ADD COLUMN IF NOT EXISTS settle_city_preferences TEXT[],
  ADD COLUMN IF NOT EXISTS relocation_willingness BOOLEAN,
  ADD COLUMN IF NOT EXISTS accepts_partner_marital_history TEXT[],
  ADD COLUMN IF NOT EXISTS accepts_partner_children BOOLEAN,
  ADD COLUMN IF NOT EXISTS relationship_pace TEXT,
  ADD COLUMN IF NOT EXISTS communication_style TEXT,
  ADD COLUMN IF NOT EXISTS biggest_concerns TEXT[];
