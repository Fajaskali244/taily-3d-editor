-- Critical RLS security fixes to explicitly block anonymous access
-- Fix policies to ensure anonymous users have ZERO access to sensitive data

-- 1) Fix profiles table - block all anonymous access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and create secure ones
DROP POLICY IF EXISTS "profiles_select_owner_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_owner_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_owner_or_admin" ON public.profiles;

-- Profiles: ONLY authenticated users can access their own data OR admins
CREATE POLICY "profiles_authenticated_owner_only"
ON public.profiles
FOR ALL
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
)
WITH CHECK (
  (auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- 2) Fix orders table - block all anonymous access
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_owner_or_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_owner_or_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_update_owner_or_admin" ON public.orders;

-- Orders: ONLY authenticated users can access their own data OR admins
CREATE POLICY "orders_authenticated_owner_only"
ON public.orders
FOR ALL
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
)
WITH CHECK (
  (auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- 3) Fix order_items table - block all anonymous access
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_owner_or_admin" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_owner_or_admin" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_owner_or_admin" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_owner_or_admin" ON public.order_items;

-- Order items: ONLY authenticated users can access via owned orders OR admins
CREATE POLICY "order_items_authenticated_owner_only"
ON public.order_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.uid() = o.user_id)
        OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.uid() = o.user_id)
        OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
      )
  )
);

-- 4) Fix cart_items table - block all anonymous access
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_items_owner_or_admin" ON public.cart_items;

-- Cart items: ONLY authenticated users can access their own data OR admins
CREATE POLICY "cart_items_authenticated_owner_only"
ON public.cart_items
FOR ALL
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
)
WITH CHECK (
  (auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- 5) Fix designs table - keep published designs public, but restrict private designs
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "designs_select_published_public" ON public.designs;
DROP POLICY IF EXISTS "designs_owner_or_admin" ON public.designs;

-- Allow public to see only published designs
CREATE POLICY "designs_public_published_only"
ON public.designs
FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- Allow authenticated users to manage their own designs OR admins all designs
CREATE POLICY "designs_authenticated_owner_only"
ON public.designs
FOR ALL
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
)
WITH CHECK (
  (auth.uid() = user_id)
  OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
);

-- 6) Fix storage policies - block anonymous access to user files
DROP POLICY IF EXISTS "Users can view their own design files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own design files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own design files" ON storage.objects;

-- Storage: ONLY authenticated users can access their own files
CREATE POLICY "storage_authenticated_owner_only"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'design-files' 
  AND (
    (auth.uid()::text = (storage.foldername(name))[1])
    OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
  )
)
WITH CHECK (
  bucket_id = 'design-files' 
  AND (
    (auth.uid()::text = (storage.foldername(name))[1])
    OR (COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin')
  )
);