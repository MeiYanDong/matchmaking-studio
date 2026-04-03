DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_observation_source_type') THEN
    CREATE TYPE field_observation_source_type AS ENUM (
      'self_reported',
      'matchmaker_summary',
      'ai_extracted',
      'verified_document'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_verification_status') THEN
    CREATE TYPE field_verification_status AS ENUM (
      'unverified',
      'pending',
      'verified',
      'rejected'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS field_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value_json JSONB,
  source_type field_observation_source_type NOT NULL DEFAULT 'ai_extracted',
  confidence INTEGER NOT NULL DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
  verification_status field_verification_status NOT NULL DEFAULT 'unverified',
  evidence_text TEXT,
  start_time_seconds INTEGER,
  end_time_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_observations_profile_field
  ON field_observations(profile_id, field_key);

CREATE INDEX IF NOT EXISTS idx_field_observations_conversation
  ON field_observations(conversation_id);

ALTER TABLE field_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "红娘可以查看自己客户的字段证据" ON field_observations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = field_observations.profile_id
        AND (profiles.matchmaker_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "红娘可以管理自己客户的字段证据" ON field_observations
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = field_observations.profile_id
        AND (profiles.matchmaker_id = auth.uid() OR is_admin())
    )
  );
