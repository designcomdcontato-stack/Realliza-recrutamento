-- Schema for Realliza Recruitment Control

-- 1. Candidates
CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text,
  gender text,
  birth_date date,
  age text,
  city text,
  phone text,
  whatsapp text,
  email text,
  experience_1 text,
  experience_2 text,
  experience_3 text,
  observations text,
  origin text,
  anonymized boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Jobs
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  requirements text,
  keyword_1 text,
  keyword_2 text,
  keyword_3 text,
  keyword_4 text,
  keyword_5 text,
  status text,
  responsible_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Applications
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  channel text,
  referred_by text,
  stage text,
  status text,
  responsible_id uuid,
  entry_date timestamptz DEFAULT now(),
  interview_date date,
  interview_time time,
  observations text,
  origin text,
  compatibility_score numeric,
  compatibility_level text,
  compatibility_details jsonb,
  matched_keywords jsonb,
  missing_keywords jsonb,
  partial_matches jsonb,
  compatibility_explanation text,
  compatibility_calculated_at timestamptz,
  experience_in_area text,
  leader_id uuid,
  sector_id uuid,
  sector_name text,
  is_employee_active boolean DEFAULT true,
  hiring_date date,
  termination_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. History Events
CREATE TABLE history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  user_id uuid,
  event_type text,
  details jsonb,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- 5. Documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  file_name text,
  file_type text,
  file_size numeric,
  category text,
  storage_path text,
  observation text,
  created_at timestamptz DEFAULT now()
);

-- 6. Interviews
CREATE TABLE interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  date date,
  time time,
  responsible_id uuid,
  status text,
  feedback text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. App Users
CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  role text,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Settings
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE,
  value jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. Channels
CREATE TABLE channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean DEFAULT true,
  position int,
  created_at timestamptz DEFAULT now()
);

-- 10. Stages
CREATE TABLE stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  position int,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 11. Statuses
CREATE TABLE statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  stage text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Row Level Security (RLS) - Basic disable for simplicity by project requirements (or rather, just schema creation)
-- To enable RLS you would run 'ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;'
