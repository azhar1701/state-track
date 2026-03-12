-- Migration: Fix validate_report_category trigger function
-- Date: 2026-03-12
-- Purpose: Correct the type comparison by casting the enum to text

CREATE OR REPLACE FUNCTION validate_report_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if category exists and is active in custom_categories
  -- Cast NEW.category to text to match custom_categories.value
  IF NOT EXISTS (
    SELECT 1 FROM custom_categories 
    WHERE value = NEW.category::text AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive category: %. Please use an active category from custom_categories table.', NEW.category;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
