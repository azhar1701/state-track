-- Update report category enum: remove lampu, taman; add irigasi, sungai already exists? ensure sungai exists
DO $$
BEGIN
  -- Add new value 'sungai' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'report_category' AND e.enumlabel = 'sungai'
  ) THEN
    ALTER TYPE public.report_category ADD VALUE IF NOT EXISTS 'sungai';
  END IF;
END$$;

-- Add new columns to reports for upgraded form
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS damage_level SMALLINT CHECK (damage_level BETWEEN 1 AND 5) DEFAULT 3,
  ADD COLUMN IF NOT EXISTS reporter_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS kecamatan TEXT,
  ADD COLUMN IF NOT EXISTS desa TEXT;

-- Create reference tables for administrative areas (simple textual reference)
CREATE TABLE IF NOT EXISTS public.kecamatan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.desa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kecamatan_id UUID REFERENCES public.kecamatan(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(kecamatan_id, name)
);

-- Indexes for faster lookup
CREATE INDEX IF NOT EXISTS idx_reports_kecamatan ON public.reports(kecamatan);
CREATE INDEX IF NOT EXISTS idx_reports_desa ON public.reports(desa);

-- Seed minimal examples (replace with real data later)
INSERT INTO public.kecamatan (name) VALUES ('Contoh Kecamatan') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.desa (kecamatan_id, name)
SELECT k.id, 'Contoh Desa' FROM public.kecamatan k WHERE k.name = 'Contoh Kecamatan'
ON CONFLICT DO NOTHING;
