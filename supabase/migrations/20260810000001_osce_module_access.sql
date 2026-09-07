-- ============================================================
-- SQL MIGRATION: OSCE MODULE ACCESS & STORAGE BUCKET
-- ============================================================

-- 1. Tambahkan kolom osce_access ke tabel public.profiles jika belum ada
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS osce_access BOOLEAN DEFAULT FALSE;

-- Index untuk pencarian cepat osce_access
CREATE INDEX IF NOT EXISTS idx_profiles_osce_access ON public.profiles(osce_access);

-- 2. Buat / Update Storage Bucket: osce_modules
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'osce_modules',
  'osce_modules',
  true,
  52428800, -- 50MB Limit per PDF file
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Policies untuk storage bucket osce_modules
DROP POLICY IF EXISTS "Public Read OSCE Modules" ON storage.objects;
CREATE POLICY "Public Read OSCE Modules"
ON storage.objects FOR SELECT
USING (bucket_id = 'osce_modules');

DROP POLICY IF EXISTS "Authenticated Insert OSCE Modules" ON storage.objects;
CREATE POLICY "Authenticated Insert OSCE Modules"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'osce_modules');

DROP POLICY IF EXISTS "Authenticated Update OSCE Modules" ON storage.objects;
CREATE POLICY "Authenticated Update OSCE Modules"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'osce_modules');

DROP POLICY IF EXISTS "Authenticated Delete OSCE Modules" ON storage.objects;
CREATE POLICY "Authenticated Delete OSCE Modules"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'osce_modules');

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
