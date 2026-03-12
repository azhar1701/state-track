-- Migration: Fix Missing Categories in custom_categories
-- Date: 2026-03-12
-- Purpose: Ensure 'sungai' and 'irigasi' exist in custom_categories table to pass validation trigger

BEGIN;

-- 1. Ensure 'sungai' exists and is active
INSERT INTO public.custom_categories (value, label, icon, color, is_active)
VALUES ('sungai', 'Sungai', '🌊', '#3b82f6', true)
ON CONFLICT (value) DO UPDATE SET is_active = true;

-- 2. Ensure 'irigasi' exists and is active
INSERT INTO public.custom_categories (value, label, icon, color, is_active)
VALUES ('irigasi', 'Irigasi', '💧', '#06b6d4', true)
ON CONFLICT (value) DO UPDATE SET is_active = true;

-- 3. Ensure other core categories are active
INSERT INTO public.custom_categories (value, label, icon, color, is_active)
VALUES 
  ('jalan', 'Jalan', '🛣️', '#3b82f6', true),
  ('jembatan', 'Jembatan', '🌉', '#22c55e', true),
  ('drainase', 'Drainase', '🚰', '#eab308', true),
  ('lainnya', 'Lainnya', '📋', '#64748b', true)
ON CONFLICT (value) DO UPDATE SET is_active = true;

COMMIT;
