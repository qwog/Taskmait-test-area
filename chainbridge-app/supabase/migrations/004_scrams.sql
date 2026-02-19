CREATE TABLE IF NOT EXISTS scrams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  facility_id UUID REFERENCES facilities(id) NOT NULL,
  line_id UUID REFERENCES facilities(id),
  station_id UUID REFERENCES facilities(id),
  trigger_pdo_id UUID REFERENCES pdos(id),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium')),
  reason TEXT NOT NULL,
  affected_systems TEXT[],
  cascade BOOLEAN DEFAULT false,
  cascade_targets UUID[],
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution TEXT CHECK (resolution IN ('resume', 'rework', 'scrap', 'escalate')),
  resolution_justification TEXT,
  trinity_gate_identity BOOLEAN,
  trinity_gate_compliance BOOLEAN,
  trinity_gate_authorization TEXT,
  resolution_pdo_id UUID REFERENCES pdos(id),
  
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);
