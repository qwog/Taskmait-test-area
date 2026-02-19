CREATE TABLE IF NOT EXISTS entity_screenings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  screening_lists TEXT[] NOT NULL,
  jurisdiction TEXT NOT NULL,
  matches JSONB,
  risk_level TEXT CHECK (risk_level IN ('clear', 'review', 'blocked')),
  pdo_id UUID REFERENCES pdos(id),
  screened_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  pilot_id TEXT NOT NULL,
  framework TEXT NOT NULL,
  time_range_start TIMESTAMPTZ NOT NULL,
  time_range_end TIMESTAMPTZ NOT NULL,
  compliance_percentage DECIMAL(5,2),
  sections JSONB,
  gaps JSONB,
  generated_by TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
