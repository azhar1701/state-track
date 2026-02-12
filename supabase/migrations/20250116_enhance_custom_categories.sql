-- Migration: Add icon, color, description to custom_categories
-- Date: 2025-01-16

ALTER TABLE custom_categories
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📋',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing categories with default icons and colors
UPDATE custom_categories SET icon = '🛣️', color = '#3b82f6' WHERE value = 'jalan';
UPDATE custom_categories SET icon = '🌉', color = '#22c55e' WHERE value = 'jembatan';
UPDATE custom_categories SET icon = '💧', color = '#06b6d4' WHERE value = 'irigasi';
UPDATE custom_categories SET icon = '🚰', color = '#eab308' WHERE value = 'drainase';
UPDATE custom_categories SET icon = '🌊', color = '#3b82f6' WHERE value = 'sungai';
UPDATE custom_categories SET icon = '📋', color = '#64748b' WHERE value = 'lainnya';

COMMENT ON COLUMN custom_categories.icon IS 'Emoji icon for category display';
COMMENT ON COLUMN custom_categories.color IS 'Hex color code for category badge';
COMMENT ON COLUMN custom_categories.description IS 'Optional description for category';
