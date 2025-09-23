-- Add idempotency_key to orders table for checkout deduplication
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Create payment_receipts table for manual payment uploads
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_receipts
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for payment_receipts (users can only access their own)
CREATE POLICY "payment_receipts_owner_rw" 
ON public.payment_receipts 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create payment_events table for audit trail
CREATE TABLE IF NOT EXISTS public.payment_events (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  actor TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  ts TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payment_events 
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for payment_events (users can read events for their orders)
CREATE POLICY "payment_events_owner_read" 
ON public.payment_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = payment_events.order_id 
    AND o.user_id = auth.uid()
  )
);

-- Create storage bucket for payment receipts (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for payment receipts
CREATE POLICY "Users can upload their own payment receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own payment receipts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add snapshot column to cart_items to store design params at checkout time
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS snapshot JSONB DEFAULT '{}';

-- Add missing columns to orders table for proper checkout flow
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_total NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_total NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS grand_total NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'unfulfilled';