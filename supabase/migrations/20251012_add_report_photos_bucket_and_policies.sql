-- Create public bucket for report photos (idempotent)
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('report-photos', 'report-photos', true);
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;

-- Ensure RLS is enabled on storage.objects (usually enabled by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read (since bucket is public, this is safe and convenient for direct image access)
DROP POLICY IF EXISTS "Allow public read on report-photos" ON storage.objects;
CREATE POLICY "Allow public read on report-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-photos');

-- Allow authenticated users to upload only into their own folder: {user_id}/...
DROP POLICY IF EXISTS "Allow authenticated upload own folder" ON storage.objects;
CREATE POLICY "Allow authenticated upload own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-photos'
  AND position(name, auth.uid()::text || '/') = 1
);

-- Allow update within own folder
DROP POLICY IF EXISTS "Allow owner update own folder" ON storage.objects;
CREATE POLICY "Allow owner update own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'report-photos'
  AND position(name, auth.uid()::text || '/') = 1
)
WITH CHECK (
  bucket_id = 'report-photos'
  AND position(name, auth.uid()::text || '/') = 1
);

-- Allow delete within own folder
DROP POLICY IF EXISTS "Allow owner delete own folder" ON storage.objects;
CREATE POLICY "Allow owner delete own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-photos'
  AND position(name, auth.uid()::text || '/') = 1
);
