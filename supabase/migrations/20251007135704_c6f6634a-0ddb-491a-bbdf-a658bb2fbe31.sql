-- Security Fix: Replace text-based shipping_address with secure address ID reference
-- This prevents redundant exposure of customer addresses in the orders table

-- 1. Add shipping_address_id column to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS shipping_address_id uuid REFERENCES public.shipping_addresses(id);

-- 2. Make the old shipping_address field nullable (we'll keep it for backward compatibility initially)
ALTER TABLE public.orders 
  ALTER COLUMN shipping_address DROP NOT NULL;

-- 3. Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address_id 
  ON public.orders(shipping_address_id);

-- 4. Add a comment to document the security improvement
COMMENT ON COLUMN public.orders.shipping_address_id IS 
  'Secure reference to shipping_addresses table. Prevents direct address exposure in orders.';
COMMENT ON COLUMN public.orders.shipping_address IS 
  'DEPRECATED: Use shipping_address_id instead. Kept for backward compatibility only.';

-- Note: The old shipping_address column is kept for backward compatibility.
-- A future migration can remove it once all existing orders are migrated to use shipping_address_id.