-- =========================================
-- Harden RLS for generation_tasks
-- Owner reads, admin reads all, service role writes only
-- =========================================

ALTER TABLE public.generation_tasks ENABLE ROW LEVEL SECURITY;

-- Remove any prior unsafe or duplicate policies
DROP POLICY IF EXISTS gen_insert_own          ON public.generation_tasks;
DROP POLICY IF EXISTS gen_update_own          ON public.generation_tasks;
DROP POLICY IF EXISTS gen_service_role_insert ON public.generation_tasks;
DROP POLICY IF EXISTS gen_service_role_update ON public.generation_tasks;
DROP POLICY IF EXISTS gen_select_own          ON public.generation_tasks;
DROP POLICY IF EXISTS gen_select_admin        ON public.generation_tasks;
DROP POLICY IF EXISTS gen_delete_own          ON public.generation_tasks;

-- Admin helper (stable, security definer)
-- Note: is_admin() already exists, so we use CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = uid AND r.role = 'admin'
  );
$$;

-- Allow authenticated clients to call it inside RLS
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Safe policies (read-only for owners; admin can read all; optional delete-own)

-- Owners can read their own rows
CREATE POLICY gen_select_own
ON public.generation_tasks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all rows
CREATE POLICY gen_select_admin
ON public.generation_tasks
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Optional: owners may delete their own rows
CREATE POLICY gen_delete_own
ON public.generation_tasks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Intentionally NO INSERT/UPDATE policies for authenticated users.
-- All writes are performed by Edge Functions using the SERVICE ROLE key.

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';