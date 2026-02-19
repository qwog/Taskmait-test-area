-- Facilities (factories, plants, lines, stations)
CREATE TABLE IF NOT EXISTS facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('plant', 'line', 'station')),
  parent_id UUID REFERENCES facilities(id),
  location_code TEXT,
  jurisdiction TEXT NOT NULL,
  erp_system TEXT,
  erp_connector_config JSONB,
  iatf_certified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
