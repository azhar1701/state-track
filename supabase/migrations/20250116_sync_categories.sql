-- Migration: Sync categories between enum and custom_categories table
-- Date: 2025-01-16
-- Purpose: Ensure custom_categories table is the single source of truth for categories

-- Step 1: Add missing enum values that exist in custom_categories
DO $$
DECLARE
  cat_record RECORD;
BEGIN
  FOR cat_record IN 
    SELECT DISTINCT value FROM custom_categories WHERE is_active = true
  LOOP
    -- Try to add enum value if it doesn't exist
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'report_category' AND e.enumlabel = cat_record.value
      ) THEN
        EXECUTE format('ALTER TYPE public.report_category ADD VALUE IF NOT EXISTS %L', cat_record.value);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add enum value: %', cat_record.value;
    END;
  END LOOP;
END$$;

-- Step 2: Ensure all enum values exist in custom_categories
INSERT INTO custom_categories (value, label, icon, color, is_active)
SELECT 
  e.enumlabel,
  INITCAP(e.enumlabel),
  CASE e.enumlabel
    WHEN 'jalan' THEN '🛣️'
    WHEN 'jembatan' THEN '🌉'
    WHEN 'irigasi' THEN '💧'
    WHEN 'drainase' THEN '🚰'
    WHEN 'sungai' THEN '🌊'
    WHEN 'lampu' THEN '💡'
    WHEN 'taman' THEN '🌳'
    ELSE '📋'
  END,
  CASE e.enumlabel
    WHEN 'jalan' THEN '#3b82f6'
    WHEN 'jembatan' THEN '#22c55e'
    WHEN 'irigasi' THEN '#06b6d4'
    WHEN 'drainase' THEN '#eab308'
    WHEN 'sungai' THEN '#3b82f6'
    WHEN 'lampu' THEN '#f59e0b'
    WHEN 'taman' THEN '#10b981'
    ELSE '#64748b'
  END,
  -- Mark old categories (lampu, taman) as inactive
  CASE WHEN e.enumlabel IN ('lampu', 'taman') THEN false ELSE true END
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'report_category'
ON CONFLICT (value) DO UPDATE SET
  icon = EXCLUDED.icon,
  color = EXCLUDED.color
WHERE custom_categories.icon IS NULL OR custom_categories.color IS NULL;

-- Step 3: Create function to validate category on insert/update
CREATE OR REPLACE FUNCTION validate_report_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if category exists and is active in custom_categories
  IF NOT EXISTS (
    SELECT 1 FROM custom_categories 
    WHERE value = NEW.category AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive category: %. Please use an active category from custom_categories table.', NEW.category;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to validate category
DROP TRIGGER IF EXISTS validate_category_trigger ON reports;
CREATE TRIGGER validate_category_trigger
  BEFORE INSERT OR UPDATE OF category ON reports
  FOR EACH ROW
  EXECUTE FUNCTION validate_report_category();

-- Step 5: Create view for active categories (for easy querying)
CREATE OR REPLACE VIEW active_categories AS
SELECT 
  id,
  value,
  label,
  icon,
  color,
  description,
  created_at
FROM custom_categories
WHERE is_active = true
ORDER BY label;

-- Grant access to view
GRANT SELECT ON active_categories TO authenticated, anon;

COMMENT ON VIEW active_categories IS 'View of active categories for use in forms and filters';
COMMENT ON FUNCTION validate_report_category() IS 'Validates that report category exists and is active in custom_categories table';
