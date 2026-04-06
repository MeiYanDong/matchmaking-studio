-- 修复数值列类型：月收入等字段应为 numeric 而非 integer
-- monthly_income 可能为 8.5（万元），integer 会导致写入失败

ALTER TABLE profiles
  ALTER COLUMN monthly_income TYPE numeric USING monthly_income::numeric,
  ALTER COLUMN weight_kg      TYPE numeric USING weight_kg::numeric;
