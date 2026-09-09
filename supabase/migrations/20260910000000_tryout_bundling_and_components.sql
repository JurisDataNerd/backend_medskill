-- ====================================================================
-- MIGRATION: TRYOUT BUNDLING, STASE A LA CARTE, & CLINICAL COMPONENTS
-- Date: 2026-09-10
-- Reference: BackLog Epic 8, 9, 10
-- ====================================================================

-- 1. ALTER TABLE TRYOUT_SETS
-- Menambahkan konfigurasi jenis bundle, urutan soal (shuffled vs fixed), dan batasan attempt
ALTER TABLE public.tryout_sets
ADD COLUMN IF NOT EXISTS bundle_type TEXT DEFAULT 'batch',
ADD COLUMN IF NOT EXISTS is_shuffled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT -1;

CREATE INDEX IF NOT EXISTS idx_tryout_sets_bundle_type ON public.tryout_sets(bundle_type);

-- 2. ALTER TABLE TRYOUT_QUESTIONS
-- Menambahkan tagging kompetensi klinis untuk kalkulasi performa spesifik
ALTER TABLE public.tryout_questions
ADD COLUMN IF NOT EXISTS clinical_component TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_tryout_questions_clinical_component ON public.tryout_questions(clinical_component);

-- 3. CREATE TABLE TRYOUT_PACKAGES
-- Master paket bundling untuk Paket 5 TO dan Paket Kombo Hemat
CREATE TABLE IF NOT EXISTS public.tryout_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- 'bundle_5_to', 'bundle_kombo'
    title TEXT NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    promo_price NUMERIC(12,2),
    total_questions INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tryout_packages_code ON public.tryout_packages(code);

-- 4. ALTER TABLE PAYMENTS
-- Menghubungkan transaksi payments dengan paket bundling tryout
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS tryout_package_id UUID REFERENCES public.tryout_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS package_type TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_tryout_package_id ON public.payments(tryout_package_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES FOR TRYOUT_PACKAGES
ALTER TABLE public.tryout_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active tryout packages" ON public.tryout_packages;
CREATE POLICY "Public can view active tryout packages"
ON public.tryout_packages FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin full access to tryout packages" ON public.tryout_packages;
CREATE POLICY "Admin full access to tryout packages"
ON public.tryout_packages FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
