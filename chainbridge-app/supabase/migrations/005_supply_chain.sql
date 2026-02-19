CREATE TABLE IF NOT EXISTS supply_chain_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upstream_facility_id UUID REFERENCES facilities(id),
  downstream_facility_id UUID REFERENCES facilities(id),
  component_family TEXT NOT NULL,
  edi_channel TEXT,
  cascade_scram BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
