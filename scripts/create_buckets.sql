-- Membuat bucket untuk setiap stase dan memisahkannya untuk stase yang memiliki lebih dari 1 file
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('bedah', 'bedah', false),
  ('dve-1', 'dve-1', false),
  ('dve-2', 'dve-2', false),
  ('endokrin', 'endokrin', false),
  ('forensik', 'forensik', false),
  ('gastro-entero-hepatologi', 'gastro-entero-hepatologi', false),
  ('hematologi', 'hematologi', false),
  ('infeksi-tropis', 'infeksi-tropis', false),
  ('kardiologi', 'kardiologi', false),
  ('mata-1', 'mata-1', false),
  ('mata-2', 'mata-2', false),
  ('nefro-reumatologi', 'nefro-reumatologi', false),
  ('neurologi-1', 'neurologi-1', false),
  ('neurologi-2', 'neurologi-2', false),
  ('obsgyn-1', 'obsgyn-1', false),
  ('obsgyn-2', 'obsgyn-2', false),
  ('pediatri', 'pediatri', false),
  ('ph-biostatik', 'ph-biostatik', false),
  ('psikiatri', 'psikiatri', false),
  ('pulmo', 'pulmo', false),
  ('tht', 'tht', false)
ON CONFLICT (id) DO NOTHING;

-- Opsional: Menambahkan RLS Policy agar pengguna yang sudah login bisa mengakses/membaca storage
CREATE POLICY "Allow authenticated users to read objects"
ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id IN (
  'bedah',
  'dve-1',
  'dve-2',
  'endokrin',
  'forensik',
  'gastro-entero-hepatologi',
  'hematologi',
  'infeksi-tropis',
  'kardiologi',
  'mata-1',
  'mata-2',
  'nefro-reumatologi',
  'neurologi-1',
  'neurologi-2',
  'obsgyn-1',
  'obsgyn-2',
  'pediatri',
  'ph-biostatik',
  'psikiatri',
  'pulmo',
  'tht'
) );
