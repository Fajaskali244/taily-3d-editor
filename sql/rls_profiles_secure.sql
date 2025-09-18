-- Harden RLS for public.profiles table
-- Blocks anonymous users, allows owner access for authenticated users, admin bypass

-- Enable RLS (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing broad SELECT policies that could allow anonymous access
DO $$
BEGIN
  -- Drop existing policies by name
  EXECUTE 'DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "select_all_profiles" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view own profile only" ON public.profiles';
  EXECUTE 'DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles';
END$$;

-- Strict SELECT policy: only owner (authenticated) or admin
CREATE POLICY "profiles_select_owner_or_admin"
ON public.profiles
FOR SELECT
USING (
  (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  )
  OR (
    COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
  )
);

-- Ensure INSERT policy is restrictive (owner only or admin)
DROP POLICY IF EXISTS "Authenticated users can create own profile only" ON public.profiles;
CREATE POLICY "profiles_insert_owner_or_admin"
ON public.profiles
FOR INSERT
WITH CHECK (
  (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  )
  OR (
    COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
  )
);

-- Ensure UPDATE policy is restrictive (owner only or admin)
DROP POLICY IF EXISTS "Authenticated users can update own profile only" ON public.profiles;
CREATE POLICY "profiles_update_owner_or_admin"
ON public.profiles
FOR UPDATE
USING (
  (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  )
  OR (
    COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
  )
)
WITH CHECK (
  (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  )
  OR (
    COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
  )
);

-- Ensure DELETE policy is restrictive (owner only or admin)
CREATE POLICY "profiles_delete_owner_or_admin"
ON public.profiles
FOR DELETE
USING (
  (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  )
  OR (
    COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
  )
);