-- Fix security issues in SECURITY DEFINER functions

-- 1. Secure the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Only allow this to be called from auth.users trigger
  IF TG_TABLE_SCHEMA != 'auth' OR TG_TABLE_NAME != 'users' THEN
    RAISE EXCEPTION 'Function can only be called from auth.users trigger';
  END IF;
  
  -- Validate that we have a valid user ID
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$function$;

-- 2. Secure the validate_and_update_order_total function  
CREATE OR REPLACE FUNCTION public.validate_and_update_order_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  calculated_total NUMERIC;
  user_owns_order BOOLEAN;
BEGIN
  -- Only allow this to be called from order_items trigger
  IF TG_TABLE_SCHEMA != 'public' OR TG_TABLE_NAME != 'order_items' THEN
    RAISE EXCEPTION 'Function can only be called from order_items trigger';
  END IF;
  
  -- Verify user owns the order (security check)
  SELECT EXISTS(
    SELECT 1 FROM public.orders 
    WHERE id = NEW.order_id 
    AND user_id = auth.uid()
  ) INTO user_owns_order;
  
  IF NOT user_owns_order THEN
    RAISE EXCEPTION 'Access denied: User does not own this order';
  END IF;
  
  -- Calculate the actual total from order items
  SELECT COALESCE(SUM(quantity * price), 0)
  INTO calculated_total
  FROM public.order_items
  WHERE order_id = NEW.order_id;
  
  -- Update the order total to match calculated total
  UPDATE public.orders
  SET total_price = calculated_total,
      updated_at = now()
  WHERE id = NEW.order_id
  AND user_id = auth.uid(); -- Additional security check
  
  RETURN NEW;
END;
$function$;