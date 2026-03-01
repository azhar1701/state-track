-- RPC for atomic update with conflict resolution (updated_at check)
CREATE OR REPLACE FUNCTION update_report_with_conflict_check(
  p_report_id UUID,
  p_expected_updated_at TIMESTAMPTZ,
  p_title TEXT,
  p_severity TEXT,
  p_resolution TEXT,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_updated_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Get current updated_at
  SELECT updated_at INTO v_current_updated_at
  FROM public.reports
  WHERE id = p_report_id;

  -- Check for conflict
  -- If p_expected_updated_at is null, we skip the check (force update)
  -- Otherwise, it must match exactly
  IF p_expected_updated_at IS NOT NULL AND v_current_updated_at != p_expected_updated_at THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'current_data', (SELECT row_to_json(r) FROM public.reports r WHERE id = p_report_id)
    );
  END IF;

  -- Perform update
  UPDATE public.reports
  SET 
    title = p_title,
    severity = p_severity::public.report_severity,
    resolution = p_resolution,
    status = p_status::public.report_status,
    updated_at = now()
  WHERE id = p_report_id;

  RETURN jsonb_build_object(
    'success', true,
    'conflict', false
  );
END;
$$;
