-- ============================================================
-- ALTER TABLES FOR TRYOUT MIDTRANS INTEGRATION
-- ============================================================

-- 1. Add price column to tryout_sets if not exists
ALTER TABLE public.tryout_sets 
ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) DEFAULT 0;

-- 2. Add tryout_id reference column to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS tryout_id UUID REFERENCES public.tryout_sets(id) ON DELETE SET NULL;

-- 3. Add payment tracking columns to tryout_registrations table
ALTER TABLE public.tryout_registrations 
ADD COLUMN IF NOT EXISTS package_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;

-- Index for fast lookup by tryout_id on payments
CREATE INDEX IF NOT EXISTS idx_payments_tryout_id ON public.payments(tryout_id);
