-- Security Fix: Restrict access to feature_flags table and remove sensitive payment data
-- This prevents public access to potentially sensitive configuration data

-- Drop the public read policy
DROP POLICY IF EXISTS "ff_public_read" ON public.feature_flags;

-- Create a restricted policy for authenticated users only
CREATE POLICY "feature_flags_authenticated_read"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- Create admin-only write policy
CREATE POLICY "feature_flags_admin_write"
ON public.feature_flags
FOR ALL
TO authenticated
USING (
  COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
)
WITH CHECK (
  COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'admin'
);

-- Remove sensitive payment data that was exposed
DELETE FROM public.feature_flags WHERE key = 'payments.manual';

-- Add a comment explaining the table's purpose
COMMENT ON TABLE public.feature_flags IS 'Application feature flags. Requires authentication to read. Only admins can modify.';