-- Comprehensive RLS hardening to block anonymous access to sensitive tables
-- while maintaining owner-only access for authenticated users and admin bypass

-- 1) public.profiles (PII data)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing broad policies
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "select_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Strict SELECT: only owner (authenticated) or admin
CREATE POLICY "profiles_select_owner_or_admin"
ON public.profiles
FOR SELECT
USING (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- Ensure INSERT is restrictive
DROP POLICY IF EXISTS "Authenticated users can create own profile only" ON public.profiles;
CREATE POLICY "profiles_insert_owner_or_admin"
ON public.profiles
FOR INSERT
WITH CHECK (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- Ensure UPDATE is restrictive
DROP POLICY IF EXISTS "Authenticated users can update own profile only" ON public.profiles;
CREATE POLICY "profiles_update_owner_or_admin"
ON public.profiles
FOR UPDATE
USING (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
)
WITH CHECK (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- 2) public.orders (financial data)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop any existing broad policies
DROP POLICY IF EXISTS "orders_select_all" ON public.orders;
DROP POLICY IF EXISTS "allow_select_orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can view their own orders only" ON public.orders;
DROP POLICY IF EXISTS "Public orders are viewable by everyone" ON public.orders;

-- Strict SELECT: only owner (authenticated) or admin
CREATE POLICY "orders_select_owner_or_admin"
ON public.orders
FOR SELECT
USING (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- Ensure INSERT is restrictive
DROP POLICY IF EXISTS "Authenticated users can create their own orders" ON public.orders;
CREATE POLICY "orders_insert_owner_or_admin"
ON public.orders
FOR INSERT
WITH CHECK (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- Ensure UPDATE is restrictive
DROP POLICY IF EXISTS "Authenticated users can update their own orders" ON public.orders;
CREATE POLICY "orders_update_owner_or_admin"
ON public.orders
FOR UPDATE
USING (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
)
WITH CHECK (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- 3) public.order_items (purchase details)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop any existing broad policies
DROP POLICY IF EXISTS "order_items_select_all" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items for their own orders" ON public.order_items;
DROP POLICY IF EXISTS "Service role can insert order items" ON public.order_items;

-- Read allowed only if parent order is owned by user or admin
CREATE POLICY "order_items_select_owner_or_admin"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.role() = 'authenticated' AND auth.uid() = o.user_id)
        OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
      )
  )
);

-- Insert/Update/Delete limited by parent order ownership or admin
CREATE POLICY "order_items_insert_owner_or_admin"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.role() = 'authenticated' AND auth.uid() = o.user_id)
        OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
      )
  )
);

CREATE POLICY "order_items_update_owner_or_admin"
ON public.order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.role() = 'authenticated' AND auth.uid() = o.user_id)
        OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.role() = 'authenticated' AND auth.uid() = o.user_id)
        OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
      )
  )
);

CREATE POLICY "order_items_delete_owner_or_admin"
ON public.order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.role() = 'authenticated' AND auth.uid() = o.user_id)
        OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
      )
  )
);

-- 4) public.cart_items (shopping behavior)
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Drop any existing broad policies
DROP POLICY IF EXISTS "cart_items_select_all" ON public.cart_items;
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can create their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

-- All operations require authentication and ownership or admin
CREATE POLICY "cart_items_owner_or_admin"
ON public.cart_items
FOR ALL
USING (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
)
WITH CHECK (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- 5) public.designs (user creations; allow public gallery for published designs)
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- Drop any existing broad policies
DROP POLICY IF EXISTS "designs_select_all" ON public.designs;
DROP POLICY IF EXISTS "Users can view their own designs" ON public.designs;
DROP POLICY IF EXISTS "Users can create their own designs" ON public.designs;
DROP POLICY IF EXISTS "Users can update their own designs" ON public.designs;
DROP POLICY IF EXISTS "Users can delete their own designs" ON public.designs;

-- Public can see ONLY published designs (for gallery)
CREATE POLICY "designs_select_published_public"
ON public.designs
FOR SELECT
USING (is_published = true);

-- Owner or admin can see and modify everything else
CREATE POLICY "designs_owner_or_admin"
ON public.designs
FOR ALL
USING (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
)
WITH CHECK (
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- Note: products and product_variants remain publicly readable as they're catalog data