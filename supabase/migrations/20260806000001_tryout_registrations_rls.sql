-- ============================================================
-- SECURE RLS POLICIES FOR TRYOUT_REGISTRATIONS
-- ============================================================

ALTER TABLE public.tryout_registrations ENABLE ROW LEVEL SECURITY;

-- Clean up older policies
DROP POLICY IF EXISTS "user can register tryout" ON public.tryout_registrations;
DROP POLICY IF EXISTS "user read own registration" ON public.tryout_registrations;
DROP POLICY IF EXISTS "user_insert_registration" ON public.tryout_registrations;
DROP POLICY IF EXISTS "user_select_own_registration" ON public.tryout_registrations;
DROP POLICY IF EXISTS "user_update_own_registration" ON public.tryout_registrations;
DROP POLICY IF EXISTS "tryout_reg_select_policy" ON public.tryout_registrations;
DROP POLICY IF EXISTS "tryout_reg_insert_policy" ON public.tryout_registrations;
DROP POLICY IF EXISTS "tryout_reg_update_policy" ON public.tryout_registrations;
DROP POLICY IF EXISTS "tryout_reg_service_role_policy" ON public.tryout_registrations;

-- 1. SELECT Policy: Users can read their own registration, admins can read all
CREATE POLICY "tryout_reg_select_policy"
ON public.tryout_registrations
FOR SELECT
TO authenticated, anon
USING (
  auth.uid() = user_id OR 
  (auth.jwt() ->> 'role') = 'admin'
);

-- 2. INSERT Policy: Authenticated users can insert rows for their own user_id
CREATE POLICY "tryout_reg_insert_policy"
ON public.tryout_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- 3. UPDATE Policy: Users can update their own registration, admins can update any
CREATE POLICY "tryout_reg_update_policy"
ON public.tryout_registrations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR 
  (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
  auth.uid() = user_id OR 
  (auth.jwt() ->> 'role') = 'admin'
);

-- 4. SERVICE ROLE Policy: Full access for backend system operations
CREATE POLICY "tryout_reg_service_role_policy"
ON public.tryout_registrations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
