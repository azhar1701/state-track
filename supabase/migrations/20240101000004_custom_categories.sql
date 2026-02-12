-- Migration: Create custom_categories table
CREATE TABLE IF NOT EXISTS custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage categories
CREATE POLICY "Admins can manage categories" ON custom_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default categories
INSERT INTO custom_categories (value, label) VALUES
  ('jalan', 'Jalan'),
  ('jembatan', 'Jembatan'),
  ('irigasi', 'Irigasi'),
  ('drainase', 'Drainase'),
  ('sungai', 'Sungai'),
  ('lainnya', 'Lainnya')
ON CONFLICT (value) DO NOTHING;

-- Create index
CREATE INDEX idx_custom_categories_active ON custom_categories(is_active);
