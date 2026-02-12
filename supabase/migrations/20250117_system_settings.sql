-- System Settings Table Migration
-- Stores all admin configuration settings (map, security, reports, notifications, etc.)

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'map', 'security', 'report', 'notification', 'geo', 'category'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, key)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_category_key ON system_settings(category, key);

-- RLS Policies (admin only)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert system settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update system settings"
  ON system_settings
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

CREATE POLICY "Admin can delete system settings"
  ON system_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_timestamp();

-- Add comment
COMMENT ON TABLE system_settings IS 'Stores all admin configuration settings for the application';
