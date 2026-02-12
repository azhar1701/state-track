-- Backup History Migration
-- Tracks all backup operations for audit and management

-- Create geo_layers table if not exists
CREATE TABLE IF NOT EXISTS geo_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  geometry_type TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geo_layers_key ON geo_layers(key);

-- Create backup_history table
CREATE TABLE IF NOT EXISTS backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL, -- 'full', 'geo_layers', 'reports', 'settings'
  file_name TEXT NOT NULL,
  file_size BIGINT,
  tables_included TEXT[],
  record_count INTEGER,
  status TEXT CHECK (status IN ('success', 'failed', 'in_progress')),
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_history_type ON backup_history(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_created_at ON backup_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_created_by ON backup_history(created_by);

-- RLS Policies for geo_layers
ALTER TABLE geo_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view geo layers"
  ON geo_layers
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admin can insert geo layers"
  ON geo_layers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update geo layers"
  ON geo_layers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete geo layers"
  ON geo_layers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for backup_history
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all backup history"
  ON backup_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert backup history"
  ON backup_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update backup history"
  ON backup_history
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to cleanup old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM backup_history
  WHERE created_at < now() - (retention_days || ' days')::INTERVAL
  AND status = 'success';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log backup operation
CREATE OR REPLACE FUNCTION log_backup(
  p_backup_type TEXT,
  p_file_name TEXT,
  p_file_size BIGINT DEFAULT NULL,
  p_tables_included TEXT[] DEFAULT NULL,
  p_record_count INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  backup_id UUID;
BEGIN
  INSERT INTO backup_history (
    backup_type,
    file_name,
    file_size,
    tables_included,
    record_count,
    status,
    error_message,
    created_by,
    completed_at
  ) VALUES (
    p_backup_type,
    p_file_name,
    p_file_size,
    p_tables_included,
    p_record_count,
    p_status,
    p_error_message,
    auth.uid(),
    CASE WHEN p_status IN ('success', 'failed') THEN now() ELSE NULL END
  )
  RETURNING id INTO backup_id;
  
  RETURN backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update geo_layers timestamp
CREATE OR REPLACE FUNCTION update_geo_layers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for geo_layers
CREATE TRIGGER geo_layers_updated_at
  BEFORE UPDATE ON geo_layers
  FOR EACH ROW
  EXECUTE FUNCTION update_geo_layers_timestamp();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_old_backups(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_backup(TEXT, TEXT, BIGINT, TEXT[], INTEGER, TEXT, TEXT) TO authenticated;

-- Add comments
COMMENT ON TABLE geo_layers IS 'Stores geographic layers data for mapping';
COMMENT ON TABLE backup_history IS 'Tracks all backup operations with metadata and status';
COMMENT ON FUNCTION cleanup_old_backups IS 'Removes backup history records older than retention period';
COMMENT ON FUNCTION log_backup IS 'Logs a backup operation to backup_history table';
