-- Migration: Create app_settings table for centralized configuration
-- This table stores all application settings with versioning and audit trail

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read/write settings
CREATE POLICY "Admins can manage settings" ON app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX idx_app_settings_category ON app_settings(category);
CREATE INDEX idx_app_settings_key ON app_settings(key);

-- Insert default settings
INSERT INTO app_settings (category, key, value) VALUES
  ('theme', 'colors', '{"primary": "#3b82f6", "accent": "#8b5cf6", "darkMode": false}'::jsonb),
  ('email', 'smtp', '{"host": "", "port": 587, "username": "", "enabled": false}'::jsonb),
  ('reports', 'export', '{"schedule": "none", "format": "csv", "retention": 365}'::jsonb),
  ('system', 'performance', '{"cacheEnabled": true, "compressionEnabled": true}'::jsonb),
  ('api', 'config', '{"rateLimit": 60, "webhookUrl": ""}'::jsonb)
ON CONFLICT (category, key) DO NOTHING;

-- Create function to update settings with audit
CREATE OR REPLACE FUNCTION update_app_setting(
  p_category TEXT,
  p_key TEXT,
  p_value JSONB
) RETURNS app_settings AS $$
DECLARE
  v_result app_settings;
BEGIN
  INSERT INTO app_settings (category, key, value, updated_by)
  VALUES (p_category, p_key, p_value, auth.uid())
  ON CONFLICT (category, key)
  DO UPDATE SET
    value = p_value,
    updated_by = auth.uid(),
    updated_at = NOW()
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
