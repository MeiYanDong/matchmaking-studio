-- 新增意图表字段
ALTER TABLE intentions
  ADD COLUMN IF NOT EXISTS dating_frequency_expectation text,      -- 约会频率期望（恋爱意图）
  ADD COLUMN IF NOT EXISTS monthly_date_budget text,               -- 月约会预算/付出意愿（恋爱意图）
  ADD COLUMN IF NOT EXISTS wedding_scale_preference text,          -- 婚礼规模偏好（结婚意图）
  ADD COLUMN IF NOT EXISTS accepts_parents_cohabitation text;      -- 是否接受父母同住（结婚意图）

-- 新增客户档案字段
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS letter_to_partner text;                 -- 想对未来另一半说的话
