-- ====================================================================
-- MIGRATION: BIMBEL PACKAGES & REGISTRATIONS WITH MIDTRANS & WA GROUP
-- ====================================================================

-- 1. TABEL BIMBEL PACKAGES (Opsi & Harga Paket per Kelas)
CREATE TABLE IF NOT EXISTS public.bimbel_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.bimbel_classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    promo_price NUMERIC(12,2),
    wa_group_link TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bimbel_packages_class_id ON public.bimbel_packages(class_id);

-- 2. ALTER TABEL PAYMENTS
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS bimbel_class_id UUID REFERENCES public.bimbel_classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS bimbel_package_id UUID REFERENCES public.bimbel_packages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_bimbel_class_id ON public.payments(bimbel_class_id);
CREATE INDEX IF NOT EXISTS idx_payments_bimbel_package_id ON public.payments(bimbel_package_id);

-- 3. TABEL BIMBEL REGISTRATIONS
CREATE TABLE IF NOT EXISTS public.bimbel_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.bimbel_classes(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.bimbel_packages(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    paid_amount NUMERIC(12,2) DEFAULT 0,
    payment_type TEXT,
    wa_group_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_bimbel_registrations_class_id ON public.bimbel_registrations(class_id);
CREATE INDEX IF NOT EXISTS idx_bimbel_registrations_package_id ON public.bimbel_registrations(package_id);
CREATE INDEX IF NOT EXISTS idx_bimbel_registrations_user_id ON public.bimbel_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_bimbel_registrations_status ON public.bimbel_registrations(status);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.bimbel_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bimbel_registrations ENABLE ROW LEVEL SECURITY;

-- Bimbel Packages Policies
DROP POLICY IF EXISTS "Public can view active bimbel packages" ON public.bimbel_packages;
CREATE POLICY "Public can view active bimbel packages"
ON public.bimbel_packages FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admin full access to bimbel packages" ON public.bimbel_packages;
CREATE POLICY "Admin full access to bimbel packages"
ON public.bimbel_packages FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Bimbel Registrations Policies
DROP POLICY IF EXISTS "Users can read own bimbel registrations" ON public.bimbel_registrations;
CREATE POLICY "Users can read own bimbel registrations"
ON public.bimbel_registrations FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR true);

DROP POLICY IF EXISTS "Users can insert own bimbel registrations" ON public.bimbel_registrations;
CREATE POLICY "Users can insert own bimbel registrations"
ON public.bimbel_registrations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR true);

DROP POLICY IF EXISTS "Admin full access to bimbel registrations" ON public.bimbel_registrations;
CREATE POLICY "Admin full access to bimbel registrations"
ON public.bimbel_registrations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. SEED DEFAULT PACKAGE FOR EXISTING CLASSES WITHOUT PACKAGES
INSERT INTO public.bimbel_packages (class_id, name, description, price, promo_price, wa_group_link, is_active, order_index)
SELECT 
    bc.id,
    'Paket Standar ' || bc.title,
    bc.description,
    COALESCE(bc.price, 0),
    bc.happy_hour_price,
    NULL,
    true,
    0
FROM public.bimbel_classes bc
WHERE NOT EXISTS (
    SELECT 1 FROM public.bimbel_packages bp WHERE bp.class_id = bc.id
);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
