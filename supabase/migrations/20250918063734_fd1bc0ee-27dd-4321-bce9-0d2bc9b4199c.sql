-- Fix security linter warning: Set search_path for the function
-- First drop the trigger, then the function, then recreate both properly

DROP TRIGGER IF EXISTS update_order_total_on_item_change ON public.order_items;
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

-- Recreate trigger with the updated function
CREATE TRIGGER update_order_total_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_update_order_total();