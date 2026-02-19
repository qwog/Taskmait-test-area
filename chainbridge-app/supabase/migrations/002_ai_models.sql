CREATE TABLE IF NOT EXISTS ai_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  model_id TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT CHECK (model_type IN (
    'vision_inspection', 'sensor_analytics', 'calibration_verification',
    'material_composition', 'assembly_verification', 'torque_check'
  )),
  facility_id UUID REFERENCES facilities(id),
  line_id UUID REFERENCES facilities(id),
  baseline_metrics JSONB NOT NULL,
  drift_tolerance_pct DECIMAL(5,2) NOT NULL DEFAULT 5.0,
  scram_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.85,
  regulatory_frameworks TEXT[] NOT NULL,
  validated_by TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired')),
  registered_at TIMESTAMPTZ DEFAULT NOW()
);
