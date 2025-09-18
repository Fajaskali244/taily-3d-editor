-- Fix security linter warning: Set search_path for the function
-- This prevents potential SQL injection through search_path manipulation

DROP FUNCTION IF EXISTS public.validate_and_update_order_total();

CREATE OR REPLACE FUNCTION public.validate_and_update_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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