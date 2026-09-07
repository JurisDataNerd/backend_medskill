-- ============================================================
-- ALTER TABLES FOR SIMULATION MIDTRANS & UPLOAD SS INTEGRATION
-- ============================================================

-- 1. Add price, registration_closed, month, year columns to simulation_sets if not exists
ALTER TABLE public.simulation_sets 
ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS registration_closed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS month INTEGER,
ADD COLUMN IF NOT EXISTS year INTEGER;

-- 2. Add simulation_id reference column to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS simulation_id UUID REFERENCES public.simulation_sets(id) ON DELETE SET NULL;

-- 3. Add payment tracking & proof upload columns to simulation_registrations table
ALTER TABLE public.simulation_registrations 
ADD COLUMN IF NOT EXISTS package_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- 4. Add image_url column to simulation_questions if not exists
ALTER TABLE public.simulation_questions 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Index for fast lookup by simulation_id on payments
CREATE INDEX IF NOT EXISTS idx_payments_simulation_id ON public.payments(simulation_id);

-- ============================================================
-- SUPABASE STORAGE BUCKET: simulation-proofs
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'simulation-proofs',
  'simulation-proofs',
  true,
  1048576, -- 1MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Policies for simulation-proofs storage bucket
DROP POLICY IF EXISTS "Public Read Simulation Proofs" ON storage.objects;
CREATE POLICY "Public Read Simulation Proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'simulation-proofs');

DROP POLICY IF EXISTS "Authenticated Insert Simulation Proofs" ON storage.objects;
CREATE POLICY "Authenticated Insert Simulation Proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'simulation-proofs');

DROP POLICY IF EXISTS "Authenticated Update Simulation Proofs" ON storage.objects;
CREATE POLICY "Authenticated Update Simulation Proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'simulation-proofs');

DROP POLICY IF EXISTS "Authenticated Delete Simulation Proofs" ON storage.objects;
CREATE POLICY "Authenticated Delete Simulation Proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'simulation-proofs');
