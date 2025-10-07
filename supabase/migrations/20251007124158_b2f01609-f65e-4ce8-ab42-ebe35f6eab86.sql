-- =====================================================
-- SECURITY ENHANCEMENT: Protect shipping_addresses PII
-- =====================================================
-- This migration hardens the shipping_addresses table by:
-- 1. Adding documentation about sensitive data
-- 2. Replacing broad policy with granular owner-only policies
-- 3. Adding admin read access for order fulfillment
-- 4. Adding validation trigger to prevent user_id manipulation
-- 5. Ensuring user_id is NOT NULL

-- Document that this table contains sensitive PII
COMMENT ON TABLE public.shipping_addresses IS 
  'Contains sensitive personal information (PII): addresses, phone numbers, recipient names. Protected by RLS policies that restrict access to owner and read-only admin access for order fulfillment.';

-- Drop the existing broad policy
DROP POLICY IF EXISTS "ship_addr_owner_rw" ON public.shipping_addresses;

-- Create granular owner-only policies for better security control
CREATE POLICY "shipping_addresses_owner_select"
  ON public.shipping_addresses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "shipping_addresses_owner_insert"
  ON public.shipping_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shipping_addresses_owner_update"
  ON public.shipping_addresses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shipping_addresses_owner_delete"
  ON public.shipping_addresses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add admin read access for legitimate operational needs (order fulfillment)
-- Admins can view addresses but cannot modify them directly
CREATE POLICY "shipping_addresses_admin_read"
  ON public.shipping_addresses
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb->>'role'),
      ''
    ) = 'admin'
  );

-- Create validation trigger function to prevent user_id manipulation
CREATE OR REPLACE FUNCTION public.validate_shipping_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow this to be called from shipping_addresses trigger
  IF TG_TABLE_SCHEMA != 'public' OR TG_TABLE_NAME != 'shipping_addresses' THEN
    RAISE EXCEPTION 'Function can only be called from shipping_addresses trigger';
  END IF;

  -- On INSERT: Ensure user_id is not null and matches authenticated user
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'user_id cannot be null';
    END IF;
    
    -- Allow admin or owner to insert
    IF auth.uid() != NEW.user_id AND 
       COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'role'), '') != 'admin' THEN
      RAISE EXCEPTION 'Can only create shipping addresses for yourself';
    END IF;
  END IF;

  -- On UPDATE: Prevent user_id changes
  IF TG_OP = 'UPDATE' THEN
    IF OLD.user_id != NEW.user_id THEN
      -- Only admin can change user_id
      IF COALESCE((current_setting('request.jwt.claims', true)::jsonb->>'role'), '') != 'admin' THEN
        RAISE EXCEPTION 'Cannot change user_id of shipping address';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to enforce validation
DROP TRIGGER IF EXISTS validate_shipping_address_trigger ON public.shipping_addresses;
CREATE TRIGGER validate_shipping_address_trigger
  BEFORE INSERT OR UPDATE ON public.shipping_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shipping_address();

-- Ensure user_id column is NOT NULL for data integrity
ALTER TABLE public.shipping_addresses 
  ALTER COLUMN user_id SET NOT NULL;