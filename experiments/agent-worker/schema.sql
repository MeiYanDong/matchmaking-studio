PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  gender TEXT,
  age INTEGER,
  city TEXT,
  current_base_cities TEXT,
  education TEXT,
  occupation TEXT,
  annual_income REAL,
  marital_history TEXT,
  has_children TEXT,
  emotional_stability TEXT,
  work_schedule TEXT,
  ai_summary TEXT,
  extra_data TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intentions (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  primary_intent TEXT,
  relationship_mode TEXT,
  acceptable_education TEXT,
  acceptable_age_min INTEGER,
  acceptable_age_max INTEGER,
  future_city_preference TEXT,
  accepts_long_distance TEXT,
  accepts_partner_marital_history TEXT,
  accepts_partner_children TEXT,
  fertility_intent TEXT,
  extra_data TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trait_profiles (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  hobbies TEXT,
  communication_style TEXT,
  relationship_pace TEXT,
  biggest_concerns TEXT,
  hidden_expectations TEXT,
  followup_strategy TEXT,
  extra_data TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  audio_bucket TEXT,
  audio_region TEXT,
  audio_key TEXT,
  audio_mime_type TEXT,
  audio_size_bytes INTEGER,
  audio_etag TEXT,
  transcript TEXT NOT NULL,
  transcript_verbose_json TEXT,
  ai_summary TEXT,
  talked_at TEXT,
  status TEXT NOT NULL DEFAULT 'transcribed',
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS followup_tasks (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'high',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  final_summary TEXT,
  step_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  tool_input TEXT,
  tool_result TEXT,
  created_at TEXT NOT NULL
);
