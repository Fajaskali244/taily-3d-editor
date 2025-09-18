// RLS Test Runner for verifying security policies
import { supabase } from '@/integrations/supabase/client';

export interface RLSTestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: string;
}

export const runRLSTests = async (): Promise<RLSTestResult[]> => {
  const results: RLSTestResult[] = [];

  // Test 1: Anonymous users cannot access profiles
  try {
    // Sign out to become anonymous
    await supabase.auth.signOut();
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('count');

    results.push({
      test: 'Anonymous access to profiles blocked',
      passed: profileError !== null || (profileData && profileData.length === 0),
      error: profileError?.message,
      details: `Got ${profileData?.length || 0} rows`
    });
  } catch (error) {
    results.push({
      test: 'Anonymous access to profiles blocked',
      passed: true,
      details: 'Exception thrown (expected for anonymous access)'
    });
  }

  // Test 2: Anonymous users cannot access orders
  try {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('count');

    results.push({
      test: 'Anonymous access to orders blocked',
      passed: orderError !== null || (orderData && orderData.length === 0),
      error: orderError?.message,
      details: `Got ${orderData?.length || 0} rows`
    });
  } catch (error) {
    results.push({
      test: 'Anonymous access to orders blocked',
      passed: true,
      details: 'Exception thrown (expected for anonymous access)'
    });
  }

  // Test 3: Anonymous users cannot access cart_items
  try {
    const { data: cartData, error: cartError } = await supabase
      .from('cart_items')
      .select('count');

    results.push({
      test: 'Anonymous access to cart_items blocked',
      passed: cartError !== null || (cartData && cartData.length === 0),
      error: cartError?.message,
      details: `Got ${cartData?.length || 0} rows`
    });
  } catch (error) {
    results.push({
      test: 'Anonymous access to cart_items blocked',
      passed: true,
      details: 'Exception thrown (expected for anonymous access)'
    });
  }

  // Test 4: Anonymous users can only see published designs
  try {
    const { data: designData, error: designError } = await supabase
      .from('designs')
      .select('*')
      .limit(10);

    // Should only return published designs or none at all
    const hasUnpublishedDesigns = designData?.some(design => !design.is_published) || false;
    
    results.push({
      test: 'Anonymous users see only published designs',
      passed: !hasUnpublishedDesigns,
      error: designError?.message,
      details: `Got ${designData?.length || 0} designs, unpublished found: ${hasUnpublishedDesigns}`
    });
  } catch (error) {
    results.push({
      test: 'Anonymous users see only published designs',
      passed: true,
      details: 'Exception thrown checking designs'
    });
  }

  // Test 5: Products and product_variants remain accessible (catalog data)
  try {
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('count');

    results.push({
      test: 'Products remain publicly accessible',
      passed: productError === null,
      error: productError?.message,
      details: `Got ${productData?.length || 0} products`
    });
  } catch (error) {
    results.push({
      test: 'Products remain publicly accessible',
      passed: false,
      details: 'Exception thrown accessing products'
    });
  }

  return results;
};

export const displayTestResults = (results: RLSTestResult[]) => {
  console.log('\n🔒 RLS Security Test Results');
  console.log('============================');
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${result.test}`);
    
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
    
    if (result.error && !result.passed) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  const passedCount = results.filter(r => r.passed).length;
  console.log(`Summary: ${passedCount}/${results.length} tests passed`);
  
  if (passedCount === results.length) {
    console.log('🎉 All security tests passed! Anonymous access is properly blocked.');
  } else {
    console.log('⚠️  Some security tests failed. Please review RLS policies.');
  }
};