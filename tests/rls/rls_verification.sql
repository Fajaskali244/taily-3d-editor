-- RLS Verification Tests for public.profiles and public.orders
-- Run these tests to verify RLS policies are working correctly

-- Test 1: Anonymous users should NOT be able to select from profiles
-- Expected: 0 rows or permission denied
-- SET ROLE anon;
-- SELECT count(*) FROM public.profiles;

-- Test 2: Anonymous users should NOT be able to select from orders  
-- Expected: 0 rows or permission denied
-- SET ROLE anon;
-- SELECT count(*) FROM public.orders;

-- Test 3: Authenticated user should only see their own profile
-- Replace 'USER_A_UUID' with actual user UUID
-- Expected: Only 1 row (their own profile) or 0 if no profile exists
/*
BEGIN;
-- Simulate authenticated user A
SET LOCAL "request.jwt.claims" TO '{"sub": "USER_A_UUID", "role": "authenticated"}';
SELECT count(*) FROM public.profiles WHERE user_id = 'USER_A_UUID';
-- Should return 1 if profile exists, 0 if not, but never > 1
ROLLBACK;
*/

-- Test 4: Authenticated user should only see their own orders
-- Replace 'USER_A_UUID' with actual user UUID
-- Expected: Only orders belonging to that user
/*
BEGIN;
-- Simulate authenticated user A
SET LOCAL "request.jwt.claims" TO '{"sub": "USER_A_UUID", "role": "authenticated"}';
SELECT count(*) FROM public.orders WHERE user_id = 'USER_A_UUID';
-- Should return only orders for this user
ROLLBACK;
*/

-- Test 5: Admin should be able to see all profiles
-- Expected: All profiles in the system
/*
BEGIN;
-- Simulate admin user
SET LOCAL "request.jwt.claims" TO '{"sub": "ADMIN_UUID", "role": "admin"}';
SELECT count(*) FROM public.profiles;
-- Should return total count of all profiles
ROLLBACK;
*/

-- Test 6: Admin should be able to see all orders
-- Expected: All orders in the system
/*
BEGIN;
-- Simulate admin user
SET LOCAL "request.jwt.claims" TO '{"sub": "ADMIN_UUID", "role": "admin"}';
SELECT count(*) FROM public.orders;
-- Should return total count of all orders
ROLLBACK;
*/

-- Test 7: User A should NOT be able to see User B's profile
-- Replace UUIDs with actual user UUIDs
-- Expected: 0 rows
/*
BEGIN;
-- Simulate authenticated user A trying to access user B's data
SET LOCAL "request.jwt.claims" TO '{"sub": "USER_A_UUID", "role": "authenticated"}';
SELECT count(*) FROM public.profiles WHERE user_id = 'USER_B_UUID';
-- Should return 0
ROLLBACK;
*/

-- Test 8: User A should NOT be able to see User B's orders
-- Replace UUIDs with actual user UUIDs
-- Expected: 0 rows
/*
BEGIN;
-- Simulate authenticated user A trying to access user B's orders
SET LOCAL "request.jwt.claims" TO '{"sub": "USER_A_UUID", "role": "authenticated"}';
SELECT count(*) FROM public.orders WHERE user_id = 'USER_B_UUID';
-- Should return 0
ROLLBACK;
*/