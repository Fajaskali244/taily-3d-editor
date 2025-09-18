-- Harden RLS for public.orders table
-- Blocks anonymous users, allows owner access for authenticated users, admin bypass

-- Enable RLS (idempotent)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop any existing broad SELECT policies that could allow anonymous access
DO $$
BEGIN
  -- Drop existing policies by name
  EXECUTE 'DROP POLICY IF EXISTS "orders_select_all" ON public.orders';
  EXECUTE 'DROP POLICY IF EXISTS "allow_select_orders" ON public.orders';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view their own orders only" ON public.orders';
  EXECUTE 'DROP POLICY IF EXISTS "Public orders are viewable by everyone" ON public.orders';
END$$;

-- Strict SELECT policy: only owner (authenticated) or admin
CREATE POLICY "orders_select_owner_or_admin"
ON public.orders
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
DROP POLICY IF EXISTS "Authenticated users can create their own orders" ON public.orders;
CREATE POLICY "orders_insert_owner_or_admin"
ON public.orders
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
DROP POLICY IF EXISTS "Authenticated users can update their own orders" ON public.orders;
CREATE POLICY "orders_update_owner_or_admin"
ON public.orders
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
CREATE POLICY "orders_delete_owner_or_admin"
ON public.orders
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