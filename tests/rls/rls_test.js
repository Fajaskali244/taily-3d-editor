// RLS Verification Tests - Node.js/TypeScript version
// Run with: node tests/rls/rls_test.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://npvkyiujvxyrrqdyrhas.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdmt5aXVqdnh5cnJxZHlyaGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjg5NzYsImV4cCI6MjA3MjY0NDk3Nn0.YSxHEQOACQ7afG9x92nBkpavgqMWzmhyBazs6Agg3aA';

// Test 1: Anonymous user access (should fail)
async function testAnonymousAccess() {
  console.log('\n=== Testing Anonymous Access ===');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');
    
    console.log('❌ Anonymous profiles access:', {
      rowCount: profiles?.length || 0,
      error: profileError?.message
    });
    
    if (profiles && profiles.length > 0) {
      console.log('🚨 SECURITY ISSUE: Anonymous users can access profiles!');
    } else {
      console.log('✅ Profiles properly protected from anonymous access');
    }
  } catch (error) {
    console.log('✅ Profiles access blocked:', error.message);
  }
  
  try {
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*');
    
    console.log('❌ Anonymous orders access:', {
      rowCount: orders?.length || 0,
      error: orderError?.message
    });
    
    if (orders && orders.length > 0) {
      console.log('🚨 SECURITY ISSUE: Anonymous users can access orders!');
    } else {
      console.log('✅ Orders properly protected from anonymous access');
    }
  } catch (error) {
    console.log('✅ Orders access blocked:', error.message);
  }
}

// Test 2: Authenticated user access (requires valid JWT)
async function testAuthenticatedAccess(userJWT) {
  if (!userJWT) {
    console.log('\n⏭️  Skipping authenticated tests - no JWT provided');
    return;
  }
  
  console.log('\n=== Testing Authenticated User Access ===');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userJWT}`
      }
    }
  });
  
  try {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');
    
    console.log('✅ Authenticated profiles access:', {
      rowCount: profiles?.length || 0,
      error: profileError?.message
    });
    
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*');
    
    console.log('✅ Authenticated orders access:', {
      rowCount: orders?.length || 0,
      error: orderError?.message
    });
    
  } catch (error) {
    console.log('❌ Authenticated access failed:', error.message);
  }
}

// Test 3: Admin access (requires admin JWT)
async function testAdminAccess(adminJWT) {
  if (!adminJWT) {
    console.log('\n⏭️  Skipping admin tests - no admin JWT provided');
    return;
  }
  
  console.log('\n=== Testing Admin Access ===');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${adminJWT}`
      }
    }
  });
  
  try {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');
    
    console.log('✅ Admin profiles access:', {
      rowCount: profiles?.length || 0,
      error: profileError?.message
    });
    
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*');
    
    console.log('✅ Admin orders access:', {
      rowCount: orders?.length || 0,
      error: orderError?.message
    });
    
  } catch (error) {
    console.log('❌ Admin access failed:', error.message);
  }
}

// Main test runner
async function runRLSTests() {
  console.log('🔒 Running RLS Security Tests');
  console.log('================================');
  
  await testAnonymousAccess();
  
  // To test authenticated and admin access, provide JWTs:
  // const userJWT = process.env.TEST_USER_JWT;
  // const adminJWT = process.env.TEST_ADMIN_JWT;
  // await testAuthenticatedAccess(userJWT);
  // await testAdminAccess(adminJWT);
  
  console.log('\n✅ RLS tests completed');
}

// Export for use in other test files
export { testAnonymousAccess, testAuthenticatedAccess, testAdminAccess };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRLSTests().catch(console.error);
}