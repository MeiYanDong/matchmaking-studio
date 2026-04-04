ALTER TYPE conversation_status ADD VALUE IF NOT EXISTS 'uploaded';
ALTER TYPE conversation_status ADD VALUE IF NOT EXISTS 'transcribed';

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS failed_stage TEXT;

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_failed_stage_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_failed_stage_check
  CHECK (failed_stage IS NULL OR failed_stage IN ('upload', 'transcribe', 'extract'));

UPDATE conversations
SET status = 'uploaded'
WHERE status = 'pending'
  AND audio_url IS NOT NULL;

UPDATE conversations
SET failed_stage = CASE
  WHEN transcript IS NOT NULL AND btrim(transcript) <> '' THEN 'extract'
  WHEN audio_url IS NOT NULL THEN 'transcribe'
  ELSE 'upload'
END
WHERE status = 'failed'
  AND failed_stage IS NULL;
