CREATE TABLE IF NOT EXISTS pdos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  facility_id UUID REFERENCES facilities(id) NOT NULL,
  line_id UUID REFERENCES facilities(id),
  station_id UUID REFERENCES facilities(id),
  
  proof_type TEXT NOT NULL,
  proof_source_system TEXT NOT NULL,
  proof_ai_model_id TEXT,
  proof_ai_model_version TEXT,
  proof_confidence_score DECIMAL(4,3),
  proof_raw_data_ref TEXT,
  proof_feature_classification JSONB,
  proof_timestamp TIMESTAMPTZ NOT NULL,
  
  decision_result TEXT NOT NULL CHECK (decision_result IN ('pass', 'fail', 'quarantine', 'escalate')),
  decision_threshold_used DECIMAL(4,3),
  decision_constitutional_rule_id TEXT,
  decision_reasoning TEXT,
  
  outcome_action TEXT NOT NULL CHECK (outcome_action IN ('proceed', 'halt', 'rework', 'scrap', 'human_review')),
  outcome_downstream_system TEXT,
  outcome_record_id TEXT,
  outcome_operator_id TEXT,
  
  pilot_id TEXT CHECK (pilot_id IN ('magna', 'roush', 'l_and_l', 'adac', 'corridor')),
  jurisdiction TEXT NOT NULL,
  regulatory_frameworks TEXT[] NOT NULL,
  
  parent_pdo_id UUID REFERENCES pdos(id),
  chain_position INTEGER DEFAULT 0,
  
  content_hash TEXT NOT NULL,
  hash_algorithm TEXT DEFAULT 'SHA-256',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
