-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011: 重构 profile_status 枚举
--
-- 旧值：active | inactive | matched | paused
-- 新值：active | paused | matched_dating | matched_married | withdrawn
--
-- 变更说明：
--   inactive  → withdrawn  （退档，语义更明确）
--   matched   → matched_dating（默认迁移为「恋爱中」，红娘可后续手动改为 matched_married）
--   新增：matched_married（已婚）
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: 临时把 status 列改为 text，脱离旧 ENUM 约束
ALTER TABLE profiles
  ALTER COLUMN status TYPE text;

-- Step 2: 数据迁移（旧值 → 新值）
UPDATE profiles SET status = 'withdrawn'       WHERE status = 'inactive';
UPDATE profiles SET status = 'matched_dating'  WHERE status = 'matched';
-- active / paused 保持不变

-- Step 3: 删除旧 ENUM 类型
DROP TYPE profile_status;

-- Step 4: 创建新 ENUM 类型
CREATE TYPE profile_status AS ENUM (
  'active',
  'paused',
  'matched_dating',
  'matched_married',
  'withdrawn'
);

-- Step 5: 把 status 列绑回新 ENUM，并恢复默认值
ALTER TABLE profiles
  ALTER COLUMN status TYPE profile_status
    USING status::profile_status,
  ALTER COLUMN status SET DEFAULT 'active';
