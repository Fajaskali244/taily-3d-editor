import { createClient } from '@supabase/supabase-js';
import { expect, test } from 'vitest';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

test('no SECURITY DEFINER views remain in public schema', async () => {
  // Query via an RPC or use a read-only connection if available.
  // If you cannot run arbitrary SQL, skip this test and rely on Supabase linter.
  // Otherwise, expose the check via a safe SQL function in migrations.
  const sb = createClient(url, anon);

  // We'll use a PostgREST RPC we create named "check_no_definer_views"
  const { data, error } = await sb.rpc('check_no_definer_views');
  if (error) throw error;
  expect((data?.count ?? 0)).toBe(0);
});
