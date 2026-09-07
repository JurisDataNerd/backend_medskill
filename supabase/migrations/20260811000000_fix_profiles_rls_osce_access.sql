-- ============================================================
-- SQL MIGRATION: FIX PROFILES RLS FOR ADMIN OSCE ACCESS UPDATE
-- ============================================================

-- 1. Pastikan kolom osce_access ada pada public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS osce_access BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_osce_access ON public.profiles(osce_access);

-- 2. Aktifkan RLS pada public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Fungsi Helper SECURITY DEFINER untuk mengecek role admin secara aman tanpa RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ),
    FALSE
  );
$$;

-- 4. Bersihkan policy lama yang membatasi update
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id or admin role" ON public.profiles;

-- 5. Policy SELECT: Semua user terautentikasi dan publik dapat membaca profil
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (true);

-- 6. Policy UPDATE: User dapat memperbarui profilnya sendiri ATAU Admin dapat memperbarui profil user manapun
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR public.is_admin()
)
WITH CHECK (
  auth.uid() = id OR public.is_admin()
);

-- 7. RLS Policy untuk tabel subscriptions & subscription (agar Admin bebas mengelola data berlangganan)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "subscriptions_select_policy" ON public.subscriptions;
    CREATE POLICY "subscriptions_select_policy" ON public.subscriptions
      FOR SELECT TO authenticated, anon USING (auth.uid() = user_id OR public.is_admin());
      
    DROP POLICY IF EXISTS "subscriptions_insert_policy" ON public.subscriptions;
    CREATE POLICY "subscriptions_insert_policy" ON public.subscriptions
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

    DROP POLICY IF EXISTS "subscriptions_update_policy" ON public.subscriptions;
    CREATE POLICY "subscriptions_update_policy" ON public.subscriptions
      FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

    DROP POLICY IF EXISTS "subscriptions_delete_policy" ON public.subscriptions;
    CREATE POLICY "subscriptions_delete_policy" ON public.subscriptions
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscription') THEN
    ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "subscription_select_policy" ON public.subscription;
    CREATE POLICY "subscription_select_policy" ON public.subscription
      FOR SELECT TO authenticated, anon USING (auth.uid() = user_id OR public.is_admin());

    DROP POLICY IF EXISTS "subscription_insert_policy" ON public.subscription;
    CREATE POLICY "subscription_insert_policy" ON public.subscription
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

    DROP POLICY IF EXISTS "subscription_update_policy" ON public.subscription;
    CREATE POLICY "subscription_update_policy" ON public.subscription
      FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

    DROP POLICY IF EXISTS "subscription_delete_policy" ON public.subscription;
    CREATE POLICY "subscription_delete_policy" ON public.subscription
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- 8. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
