-- 颜值评分锚点表
-- 存储每个分值段（按性别）的文字描述和示例图
-- 红娘可在打分 popover 内上传示例图，互相覆盖

CREATE TABLE scoring_anchors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score         numeric(3,1) NOT NULL,          -- 5.0 / 6.0 / 6.5 / 7.0 / 8.0 / 9.0
  gender        text NOT NULL CHECK (gender IN ('male', 'female')),
  description   text NOT NULL DEFAULT '',
  image_url     text,
  uploaded_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (score, gender)
);

-- 预填文字锚点（女性）
INSERT INTO scoring_anchors (score, gender, description) VALUES
  (5.0, 'female', '路人水准，无明显特点'),
  (6.0, 'female', '班花水平，同学圈里好看的那个'),
  (6.5, 'female', '系花/院花水平'),
  (7.0, 'female', '校花级，可做小红书博主（1–5万粉）'),
  (8.0, 'female', '网红水准（10万粉以上）'),
  (9.0, 'female', '顶级网红/艺人水准');

-- 预填文字锚点（男性）
INSERT INTO scoring_anchors (score, gender, description) VALUES
  (5.0, 'male', '路人水准'),
  (6.0, 'male', '公司里的帅哥'),
  (6.5, 'male', '全校公认帅'),
  (7.0, 'male', '明星脸，网友夸的那种'),
  (8.0, 'male', '偶像剧男主脸'),
  (9.0, 'male', '顶流艺人水准');

-- RLS
ALTER TABLE scoring_anchors ENABLE ROW LEVEL SECURITY;

-- 红娘和管理员都可读
CREATE POLICY "scoring_anchors_select"
  ON scoring_anchors FOR SELECT
  TO authenticated
  USING (true);

-- 红娘和管理员都可更新（image_url / uploaded_by / updated_at）
CREATE POLICY "scoring_anchors_update"
  ON scoring_anchors FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
