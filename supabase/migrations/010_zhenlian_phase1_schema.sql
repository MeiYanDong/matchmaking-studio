-- ============================================================
-- 010_zhenlian_phase1_schema.sql
-- 甄恋 CRM 第一阶段 schema 迁移
-- 依据：freeze-zhenlian-fields-v1.md / freeze-zhenlian-data-model-v1.md / freeze-zhenlian-status-model-v1.md
-- 策略：只增不删，旧字段保留用于兼容，新字段按冻结 key 名新增
-- ============================================================

-- ============================================================
-- PART 1: 新 enum 类型
-- ============================================================

-- 8 态生命周期状态（替代旧 ProfileStatus 四态）
DO $$ BEGIN
  CREATE TYPE lifecycle_status AS ENUM (
    'new_pending_completion',
    'actively_searching',
    'recommended',
    'meeting_in_progress',
    'feedback_pending_entry',
    'paused',
    'matched_success',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 学历（新值域，替代旧 education_level）
DO $$ BEGIN
  CREATE TYPE education_level_v2 AS ENUM (
    'high_school_or_below',
    'junior_college',
    'bachelor',
    'master',
    'doctor',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 婚史
DO $$ BEGIN
  CREATE TYPE marital_history_type AS ENUM (
    'never_married',
    'divorced',
    'widowed',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 是否有孩子（tri-state，替代 boolean）
DO $$ BEGIN
  CREATE TYPE has_children_type AS ENUM (
    'yes',
    'no',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 抚养权归属
DO $$ BEGIN
  CREATE TYPE custody_status_type AS ENUM (
    'self',
    'ex_partner',
    'shared',
    'other',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 是否有房/车（统一三值枚举）
DO $$ BEGIN
  CREATE TYPE has_asset_type AS ENUM (
    'yes',
    'no',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 生活习惯（吸烟/饮酒，替代 boolean）
DO $$ BEGIN
  CREATE TYPE lifestyle_yn_type AS ENUM (
    'yes',
    'no',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 频率（吸烟/饮酒频率）
DO $$ BEGIN
  CREATE TYPE frequency_type AS ENUM (
    'occasionally',
    'frequently',
    'daily',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 家庭总资产档位
DO $$ BEGIN
  CREATE TYPE family_asset_band_type AS ENUM (
    'A7',
    'A8',
    'A9',
    'A10',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 收入来源性质
DO $$ BEGIN
  CREATE TYPE income_source_category AS ENUM (
    'salary',
    'dividend',
    'self_business',
    'mixed',
    'other',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 迫切程度（替代 seriousness_score）
DO $$ BEGIN
  CREATE TYPE urgency_level_type AS ENUM (
    'low',
    'normal',
    'high',
    'urgent',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 父母婚姻状态
DO $$ BEGIN
  CREATE TYPE parents_marital_status_type AS ENUM (
    'together',
    'divorced',
    'widowed',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 与前任金融往来
DO $$ BEGIN
  CREATE TYPE financial_ties_type AS ENUM (
    'yes',
    'no',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PART 2: profiles 表新增字段
-- （旧字段保留，不做 DROP）
-- ============================================================

ALTER TABLE profiles
  -- P0 核心识别
  ADD COLUMN IF NOT EXISTS full_name         text,           -- 正式姓名，替代 name
  ADD COLUMN IF NOT EXISTS display_name      text,           -- 昵称/常用称呼
  ADD COLUMN IF NOT EXISTS current_city      text,           -- 当前所在城市，替代 city

  -- P1 匹配关键
  ADD COLUMN IF NOT EXISTS birth_year_month  text,           -- 出生年月 YYYY-MM，age 由此派生
  ADD COLUMN IF NOT EXISTS height_cm         integer,        -- 替代 height
  ADD COLUMN IF NOT EXISTS weight_kg         integer,        -- 替代 weight
  ADD COLUMN IF NOT EXISTS wechat_id         text,           -- 微信号

  -- P2 学历拆分
  ADD COLUMN IF NOT EXISTS education_level_v2  education_level_v2,  -- 替代 education enum
  ADD COLUMN IF NOT EXISTS bachelor_school   text,
  ADD COLUMN IF NOT EXISTS master_school     text,
  ADD COLUMN IF NOT EXISTS doctor_school     text,
  ADD COLUMN IF NOT EXISTS major             text,

  -- P2 工作/收入
  ADD COLUMN IF NOT EXISTS company_name      text,           -- 工作单位，替代 occupation
  ADD COLUMN IF NOT EXISTS monthly_income    integer,        -- 月收入（CNY）
  ADD COLUMN IF NOT EXISTS income_source_type income_source_category,

  -- P2 资产拆分
  ADD COLUMN IF NOT EXISTS has_property      has_asset_type,
  ADD COLUMN IF NOT EXISTS property_count    integer,
  ADD COLUMN IF NOT EXISTS property_notes    text,
  ADD COLUMN IF NOT EXISTS has_vehicle       has_asset_type,
  ADD COLUMN IF NOT EXISTS vehicle_brand     text,
  ADD COLUMN IF NOT EXISTS vehicle_model     text,
  ADD COLUMN IF NOT EXISTS vehicle_notes     text,
  ADD COLUMN IF NOT EXISTS family_asset_band family_asset_band_type,
  ADD COLUMN IF NOT EXISTS financial_assets_notes text,
  ADD COLUMN IF NOT EXISTS insurance_notes   text,

  -- P3 婚育（enum 化）
  ADD COLUMN IF NOT EXISTS marital_history_enum  marital_history_type,  -- 替代 marital_history text
  ADD COLUMN IF NOT EXISTS marital_history_notes text,
  ADD COLUMN IF NOT EXISTS has_children_enum     has_children_type,     -- 替代 has_children boolean
  ADD COLUMN IF NOT EXISTS children_count        integer,
  ADD COLUMN IF NOT EXISTS children_age_notes    text,
  ADD COLUMN IF NOT EXISTS custody_status        custody_status_type,
  ADD COLUMN IF NOT EXISTS financial_ties_with_ex_partner financial_ties_type,

  -- P3 生活习惯（enum 化）
  ADD COLUMN IF NOT EXISTS smokes            lifestyle_yn_type,   -- 替代 smoking boolean
  ADD COLUMN IF NOT EXISTS smoking_frequency frequency_type,
  ADD COLUMN IF NOT EXISTS drinks            lifestyle_yn_type,   -- 替代 drinking boolean
  ADD COLUMN IF NOT EXISTS drinking_frequency frequency_type,

  -- P3 推进/家庭
  ADD COLUMN IF NOT EXISTS urgency_level     urgency_level_type,  -- 替代 seriousness_score
  ADD COLUMN IF NOT EXISTS hukou_city        text,
  ADD COLUMN IF NOT EXISTS native_place      text,
  ADD COLUMN IF NOT EXISTS siblings_summary  text,
  ADD COLUMN IF NOT EXISTS parents_occupation text,
  ADD COLUMN IF NOT EXISTS parents_marital_status parents_marital_status_type,
  ADD COLUMN IF NOT EXISTS family_origin_notes text,

  -- P3 性格/自我
  ADD COLUMN IF NOT EXISTS mbti              text,
  ADD COLUMN IF NOT EXISTS personality_summary text,
  ADD COLUMN IF NOT EXISTS self_description  text;

-- ============================================================
-- PART 3: customer_lifecycle 表
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_lifecycle (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status               lifecycle_status NOT NULL DEFAULT 'new_pending_completion',
  owner                uuid,                        -- 负责红娘 user_id（不强制 FK，允许用户被删）
  next_action          text,
  due_at               timestamptz,
  blocking_reason      text,
  last_progressed_at   timestamptz,
  last_contact_at      timestamptz,
  paused_at            timestamptz,
  archived_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_lifecycle_profile_id_unique UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS customer_lifecycle_profile_id_idx ON customer_lifecycle(profile_id);
CREATE INDEX IF NOT EXISTS customer_lifecycle_status_idx ON customer_lifecycle(status);
CREATE INDEX IF NOT EXISTS customer_lifecycle_owner_idx ON customer_lifecycle(owner);
CREATE INDEX IF NOT EXISTS customer_lifecycle_due_at_idx ON customer_lifecycle(due_at);

-- ============================================================
-- PART 4: customer_source 表
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_source (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  primary_source_channel text,
  source_code            text,
  acquired_at            timestamptz,
  source_notes           text,
  referrer_name          text,
  campaign_name          text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_source_profile_id_unique UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS customer_source_profile_id_idx ON customer_source(profile_id);

-- ============================================================
-- PART 5: 数据回填（旧字段 → 新字段）
-- ============================================================

-- full_name ← name
UPDATE profiles SET full_name = name
WHERE full_name IS NULL AND name IS NOT NULL;

-- current_city ← city
UPDATE profiles SET current_city = city
WHERE current_city IS NULL AND city IS NOT NULL;

-- height_cm ← height（假设已存 cm 整数）
UPDATE profiles SET height_cm = height::integer
WHERE height_cm IS NULL AND height IS NOT NULL;

-- weight_kg ← weight
UPDATE profiles SET weight_kg = weight::integer
WHERE weight_kg IS NULL AND weight IS NOT NULL;

-- education_level_v2 ← education（旧枚举值映射）
UPDATE profiles SET education_level_v2 =
  CASE education::text
    WHEN 'high_school' THEN 'high_school_or_below'::education_level_v2
    WHEN 'associate'   THEN 'junior_college'::education_level_v2
    WHEN 'bachelor'    THEN 'bachelor'::education_level_v2
    WHEN 'master'      THEN 'master'::education_level_v2
    WHEN 'phd'         THEN 'doctor'::education_level_v2
    WHEN 'other'       THEN 'unknown'::education_level_v2
    ELSE 'unknown'::education_level_v2
  END
WHERE education_level_v2 IS NULL AND education IS NOT NULL;

-- marital_history_enum ← marital_history（文本映射）
UPDATE profiles SET marital_history_enum =
  CASE
    WHEN marital_history IN ('never_married', '未婚')   THEN 'never_married'::marital_history_type
    WHEN marital_history IN ('divorced', '离异')         THEN 'divorced'::marital_history_type
    WHEN marital_history IN ('widowed', '丧偶')          THEN 'widowed'::marital_history_type
    ELSE 'unknown'::marital_history_type
  END
WHERE marital_history_enum IS NULL AND marital_history IS NOT NULL;

-- has_children_enum ← has_children（boolean → tri-state）
UPDATE profiles SET has_children_enum =
  CASE has_children
    WHEN true  THEN 'yes'::has_children_type
    WHEN false THEN 'no'::has_children_type
    ELSE 'unknown'::has_children_type
  END
WHERE has_children_enum IS NULL AND has_children IS NOT NULL;

-- smokes ← smoking（boolean → enum）
UPDATE profiles SET smokes =
  CASE smoking
    WHEN true  THEN 'yes'::lifestyle_yn_type
    WHEN false THEN 'no'::lifestyle_yn_type
    ELSE 'unknown'::lifestyle_yn_type
  END
WHERE smokes IS NULL AND smoking IS NOT NULL;

-- drinks ← drinking（boolean → enum）
UPDATE profiles SET drinks =
  CASE drinking
    WHEN true  THEN 'yes'::lifestyle_yn_type
    WHEN false THEN 'no'::lifestyle_yn_type
    ELSE 'unknown'::lifestyle_yn_type
  END
WHERE drinks IS NULL AND drinking IS NOT NULL;

-- monthly_income ← annual_income / 12（估算，仅在 monthly_income 为空时）
UPDATE profiles SET monthly_income = (annual_income / 12)::integer
WHERE monthly_income IS NULL AND annual_income IS NOT NULL;

-- ============================================================
-- PART 6: customer_lifecycle 初始化（为所有已存在 profile 创建记录）
-- 旧 ProfileStatus 四态 → 新 8 态映射
-- ============================================================

INSERT INTO customer_lifecycle (profile_id, status, created_at, updated_at)
SELECT
  id,
  CASE status::text
    WHEN 'active'   THEN 'actively_searching'::lifecycle_status
    WHEN 'inactive' THEN 'new_pending_completion'::lifecycle_status
    WHEN 'matched'  THEN 'matched_success'::lifecycle_status
    WHEN 'paused'   THEN 'paused'::lifecycle_status
    ELSE 'new_pending_completion'::lifecycle_status
  END,
  created_at,
  updated_at
FROM profiles
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================================
-- 完成
-- ============================================================
