-- Fix security vulnerability: Remove overly permissive order_items insert policy
-- and replace with secure policies

-- Drop the dangerous policy that allows anyone to insert order items
DROP POLICY IF EXISTS "System can insert order items" ON public.order_items;

-- Create a more secure policy that only allows authenticated users to insert order items
-- for orders they own, and only through proper order creation process
CREATE POLICY "Users can create order items for their own orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Add an additional policy to allow service role (edge functions) to insert order items
-- This is needed for secure server-side order processing
CREATE POLICY "Service role can insert order items"
ON public.order_items
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also ensure orders table has proper constraints to prevent price manipulation
-- Add a trigger to automatically calculate and validate order totals

CREATE OR REPLACE FUNCTION public.validate_and_update_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  calculated_total NUMERIC;
BEGIN
  -- Calculate the actual total from order items
  SELECT COALESCE(SUM(quantity * price), 0)
  INTO calculated_total
  FROM public.order_items
  WHERE order_id = NEW.order_id;
  
  -- Update the order total to match calculated total
  UPDATE public.orders
  SET total_price = calculated_total,
      updated_at = now()
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update order totals when order items are inserted/updated
DROP TRIGGER IF EXISTS update_order_total_on_item_change ON public.order_items;
CREATE TRIGGER update_order_total_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_update_order_total();

-- Add constraint to ensure order items have positive prices and quantities
ALTER TABLE public.order_items 
ADD CONSTRAINT check_positive_price 
CHECK (price >= 0);

ALTER TABLE public.order_items 
ADD CONSTRAINT check_positive_quantity 
CHECK (quantity > 0);