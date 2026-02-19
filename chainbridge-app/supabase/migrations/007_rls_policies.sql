ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdos ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_facilities" ON facilities FOR ALL 
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID);
CREATE POLICY "org_access_pdos" ON pdos FOR ALL 
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID);
CREATE POLICY "org_access_scrams" ON scrams FOR ALL 
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID);
CREATE POLICY "org_access_ai_models" ON ai_models FOR ALL 
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID);
CREATE POLICY "org_access_entity_screenings" ON entity_screenings FOR ALL 
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID);
CREATE POLICY "org_access_compliance_reports" ON compliance_reports FOR ALL 
  USING (org_id = (auth.jwt()->'app_metadata'->>'org_id')::UUID);
