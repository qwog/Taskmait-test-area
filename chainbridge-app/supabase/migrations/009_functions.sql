CREATE OR REPLACE FUNCTION get_dashboard_stats(p_org_id UUID, p_hours INTEGER DEFAULT 24)
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_pdos', COUNT(*),
    'pass_count', COUNT(*) FILTER (WHERE decision_result = 'pass'),
    'fail_count', COUNT(*) FILTER (WHERE decision_result = 'fail'),
    'quarantine_count', COUNT(*) FILTER (WHERE decision_result = 'quarantine'),
    'escalate_count', COUNT(*) FILTER (WHERE decision_result = 'escalate'),
    'avg_confidence', ROUND(AVG(proof_confidence_score)::numeric, 3),
    'active_scrams', (SELECT COUNT(*) FROM scrams WHERE org_id = p_org_id AND status = 'active'),
    'models_with_drift', 0
  )
  FROM pdos
  WHERE org_id = p_org_id
    AND created_at > NOW() - (p_hours || ' hours')::INTERVAL;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_pdo_trend(p_org_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE(day DATE, pass_count BIGINT, fail_count BIGINT, quarantine_count BIGINT) AS $$
  SELECT 
    DATE(created_at) as day,
    COUNT(*) FILTER (WHERE decision_result = 'pass') as pass_count,
    COUNT(*) FILTER (WHERE decision_result = 'fail') as fail_count,
    COUNT(*) FILTER (WHERE decision_result = 'quarantine') as quarantine_count
  FROM pdos
  WHERE org_id = p_org_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY day ASC;
$$ LANGUAGE sql STABLE;
