-- ============================================================
-- 婚恋匹配平台 - 初始数据库结构
-- ============================================================

-- 枚举类型
CREATE TYPE gender_type AS ENUM ('male', 'female');
CREATE TYPE profile_status AS ENUM ('active', 'inactive', 'matched', 'paused');
CREATE TYPE education_level AS ENUM ('high_school', 'associate', 'bachelor', 'master', 'phd', 'other');
CREATE TYPE primary_intent AS ENUM ('marriage', 'dating', 'fertility');
CREATE TYPE conversation_status AS ENUM ('pending', 'transcribing', 'extracting', 'done', 'failed');
CREATE TYPE match_status AS ENUM (
  'pending', 'reviewing', 'contacted_male', 'contacted_female',
  'both_agreed', 'meeting_scheduled', 'met', 'succeeded', 'failed', 'dismissed'
);
CREATE TYPE reminder_type AS ENUM ('no_followup', 'no_new_info', 'meeting_reminder');
CREATE TYPE user_role AS ENUM ('admin', 'matchmaker');

-- ============================================================
-- 用户角色表
-- ============================================================
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 客户档案表
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  matchmaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  gender gender_type NOT NULL,
  status profile_status DEFAULT 'active',
  name TEXT NOT NULL,
  age INTEGER,
  height INTEGER,
  weight INTEGER,
  city TEXT,
  hometown TEXT,
  education education_level,
  occupation TEXT,
  job_title TEXT,
  annual_income INTEGER,
  income_range TEXT,
  assets TEXT,
  appearance_score INTEGER CHECK (appearance_score >= 1 AND appearance_score <= 10),
  photo_urls TEXT[],
  ai_summary TEXT,
  raw_notes TEXT,
  phone TEXT
);

-- updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 意图与偏好表
-- ============================================================
CREATE TABLE intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  primary_intent primary_intent,
  intent_notes TEXT,
  preferred_age_min INTEGER,
  preferred_age_max INTEGER,
  preferred_height_min INTEGER,
  preferred_cities TEXT[],
  preferred_education education_level[],
  preferred_income_min INTEGER,
  dealbreakers TEXT[],
  tolerance_notes TEXT,
  acceptable_conditions TEXT[],
  accepts_long_distance BOOLEAN,
  long_distance_notes TEXT,
  implicit_intent_notes TEXT
);

CREATE TRIGGER intentions_updated_at
  BEFORE UPDATE ON intentions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 语音记录表
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  matchmaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  audio_url TEXT,
  audio_duration INTEGER,
  status conversation_status DEFAULT 'pending',
  error_message TEXT,
  transcript TEXT,
  extracted_fields JSONB,
  extraction_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

-- ============================================================
-- 匹配记录表
-- ============================================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  male_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  female_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  matchmaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  match_score FLOAT NOT NULL,
  score_breakdown JSONB,
  match_reason TEXT,
  status match_status DEFAULT 'pending',
  matchmaker_notes TEXT,
  meeting_time TIMESTAMPTZ,
  meeting_location TEXT,
  outcome_notes TEXT,
  dismissed_reason TEXT,
  UNIQUE(male_profile_id, female_profile_id)
);

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 提醒表
-- ============================================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  matchmaker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  type reminder_type NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX idx_profiles_matchmaker_id ON profiles(matchmaker_id);
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_conversations_profile_id ON conversations(profile_id);
CREATE INDEX idx_conversations_matchmaker_id ON conversations(matchmaker_id);
CREATE INDEX idx_matches_male_profile_id ON matches(male_profile_id);
CREATE INDEX idx_matches_female_profile_id ON matches(female_profile_id);
CREATE INDEX idx_matches_matchmaker_id ON matches(matchmaker_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_reminders_matchmaker_is_read ON reminders(matchmaker_id, is_read);

-- ============================================================
-- RLS 行级安全策略
-- ============================================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Helper function: 判断当前用户是否为 admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- user_roles
CREATE POLICY "用户可以查看自己的角色" ON user_roles
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "admin可以管理所有角色" ON user_roles
  FOR ALL USING (is_admin());

-- profiles
CREATE POLICY "红娘可以查看自己的客户" ON profiles
  FOR SELECT USING (matchmaker_id = auth.uid() OR is_admin());

CREATE POLICY "红娘可以创建客户" ON profiles
  FOR INSERT WITH CHECK (matchmaker_id = auth.uid());

CREATE POLICY "红娘可以更新自己的客户" ON profiles
  FOR UPDATE USING (matchmaker_id = auth.uid() OR is_admin());

CREATE POLICY "admin可以删除客户" ON profiles
  FOR DELETE USING (is_admin());

-- intentions
CREATE POLICY "红娘可以查看自己客户的意图" ON intentions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = intentions.profile_id AND (profiles.matchmaker_id = auth.uid() OR is_admin()))
  );

CREATE POLICY "红娘可以管理自己客户的意图" ON intentions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = intentions.profile_id AND (profiles.matchmaker_id = auth.uid() OR is_admin()))
  );

-- conversations
CREATE POLICY "红娘可以查看自己的对话记录" ON conversations
  FOR SELECT USING (matchmaker_id = auth.uid() OR is_admin());

CREATE POLICY "红娘可以创建对话记录" ON conversations
  FOR INSERT WITH CHECK (matchmaker_id = auth.uid());

CREATE POLICY "红娘可以更新自己的对话记录" ON conversations
  FOR UPDATE USING (matchmaker_id = auth.uid() OR is_admin());

-- matches
CREATE POLICY "红娘可以查看涉及自己客户的匹配" ON matches
  FOR SELECT USING (
    matchmaker_id = auth.uid() OR is_admin() OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = matches.male_profile_id AND profiles.matchmaker_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = matches.female_profile_id AND profiles.matchmaker_id = auth.uid())
  );

CREATE POLICY "系统和admin可以创建匹配" ON matches
  FOR INSERT WITH CHECK (is_admin() OR matchmaker_id = auth.uid());

CREATE POLICY "红娘可以更新涉及自己客户的匹配" ON matches
  FOR UPDATE USING (matchmaker_id = auth.uid() OR is_admin());

-- reminders
CREATE POLICY "红娘只能看自己的提醒" ON reminders
  FOR SELECT USING (matchmaker_id = auth.uid() OR is_admin());

CREATE POLICY "系统可以创建提醒" ON reminders
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "红娘可以更新自己的提醒" ON reminders
  FOR UPDATE USING (matchmaker_id = auth.uid() OR is_admin());
