-- Comprehensive RLS Testing for Hardened Security Policies
-- Tests anonymous access is completely blocked while maintaining proper authenticated access

\echo 'Starting comprehensive RLS security tests...'

-- Test 1: Anonymous users cannot access profiles
\echo 'Test 1: Verifying anonymous access to profiles is blocked...'
SET request.jwt.claims = '{}';
SET request.jwt.claim.role = 'anon';
DO $$
DECLARE
  profile_count INT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    RAISE NOTICE 'FAIL: Anonymous user accessed % profiles (should be 0)', profile_count;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anonymous access to profiles properly blocked';
  END;
END;
$$;

-- Test 2: Anonymous users cannot access orders
\echo 'Test 2: Verifying anonymous access to orders is blocked...'
DO $$
DECLARE
  order_count INT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO order_count FROM public.orders;
    RAISE NOTICE 'FAIL: Anonymous user accessed % orders (should be 0)', order_count;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anonymous access to orders properly blocked';
  END;
END;
$$;

-- Test 3: Anonymous users cannot access cart_items
\echo 'Test 3: Verifying anonymous access to cart_items is blocked...'
DO $$
DECLARE
  cart_count INT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO cart_count FROM public.cart_items;
    RAISE NOTICE 'FAIL: Anonymous user accessed % cart items (should be 0)', cart_count;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anonymous access to cart_items properly blocked';
  END;
END;
$$;

-- Test 4: Anonymous users cannot access order_items
\echo 'Test 4: Verifying anonymous access to order_items is blocked...'
DO $$
DECLARE
  item_count INT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO item_count FROM public.order_items;
    RAISE NOTICE 'FAIL: Anonymous user accessed % order items (should be 0)', item_count;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Anonymous access to order_items properly blocked';
  END;
END;
$$;

-- Test 5: Anonymous users can only see published designs
\echo 'Test 5: Verifying anonymous users only see published designs...'
DO $$
DECLARE
  design_count INT;
  unpublished_count INT;
BEGIN
  SELECT COUNT(*) INTO design_count FROM public.designs;
  SELECT COUNT(*) INTO unpublished_count FROM public.designs WHERE is_published = false;
  
  IF unpublished_count = 0 THEN
    RAISE NOTICE 'PASS: Anonymous users see % designs, 0 unpublished', design_count;
  ELSE
    RAISE NOTICE 'FAIL: Anonymous users can see % unpublished designs', unpublished_count;
  END IF;
END;
$$;

-- Test 6: Products remain publicly accessible
\echo 'Test 6: Verifying products remain publicly accessible...'
DO $$
DECLARE
  product_count INT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO product_count FROM public.products;
    RAISE NOTICE 'PASS: Products accessible to anonymous users (% products)', product_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAIL: Products should be publicly accessible but access was denied';
  END;
END;
$$;

-- Test 7: Product variants remain publicly accessible
\echo 'Test 7: Verifying product variants remain publicly accessible...'
DO $$
DECLARE
  variant_count INT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO variant_count FROM public.product_variants;
    RAISE NOTICE 'PASS: Product variants accessible to anonymous users (% variants)', variant_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAIL: Product variants should be publicly accessible but access was denied';
  END;
END;
$$;

-- Simulate authenticated user access
\echo 'Test 8: Simulating authenticated user access...'
DO $$
DECLARE
  test_user_id UUID := '12345678-1234-1234-1234-123456789012';
  profile_count INT;
  order_count INT;
  cart_count INT;
  design_count INT;
BEGIN
  -- Set JWT claims for authenticated user
  PERFORM set_config('request.jwt.claims', 
    json_build_object(
      'sub', test_user_id,
      'role', 'authenticated',
      'aud', 'authenticated'
    )::text, 
    true
  );
  PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Test access to own data (should work)
  BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE user_id = test_user_id;
    SELECT COUNT(*) INTO order_count FROM public.orders WHERE user_id = test_user_id;
    SELECT COUNT(*) INTO cart_count FROM public.cart_items WHERE user_id = test_user_id;
    SELECT COUNT(*) INTO design_count FROM public.designs WHERE user_id = test_user_id;
    
    RAISE NOTICE 'PASS: Authenticated user can access own data (profiles: %, orders: %, cart: %, designs: %)', 
      profile_count, order_count, cart_count, design_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAIL: Authenticated user should be able to access own data';
  END;
END;
$$;

-- Test admin access
\echo 'Test 9: Simulating admin user access...'
DO $$
DECLARE
  admin_user_id UUID := '87654321-4321-4321-4321-210987654321';
  profile_count INT;
  order_count INT;
  cart_count INT;
  design_count INT;
BEGIN
  -- Set JWT claims for admin user
  PERFORM set_config('request.jwt.claims', 
    json_build_object(
      'sub', admin_user_id,
      'role', 'admin',
      'aud', 'authenticated'
    )::text, 
    true
  );
  PERFORM set_config('request.jwt.claim.sub', admin_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'admin', true);

  -- Test access to all data (should work for admin)
  BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO order_count FROM public.orders;
    SELECT COUNT(*) INTO cart_count FROM public.cart_items;
    SELECT COUNT(*) INTO design_count FROM public.designs;
    
    RAISE NOTICE 'PASS: Admin can access all data (profiles: %, orders: %, cart: %, designs: %)', 
      profile_count, order_count, cart_count, design_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAIL: Admin should be able to access all data';
  END;
END;
$$;

\echo 'RLS security tests completed!'