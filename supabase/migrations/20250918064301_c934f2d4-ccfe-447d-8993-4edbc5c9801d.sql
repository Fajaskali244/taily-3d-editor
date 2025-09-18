-- Taily Phase 1: Add missing tables and enhance existing schema
-- Check and add only what's needed

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'active',
  default_price NUMERIC(12,2) NOT NULL,
  thumbnail_url TEXT,
  template_3d_url TEXT,
  min_thickness_mm NUMERIC DEFAULT 2.0,
  max_chars INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_variants table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  base_price NUMERIC(12,2) NOT NULL,
  weight_grams INTEGER DEFAULT 50,
  ready_to_ship BOOLEAN DEFAULT false,
  material TEXT DEFAULT 'plastic',
  color TEXT DEFAULT 'black',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add design_id to cart_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'design_id'
  ) THEN
    ALTER TABLE public.cart_items ADD COLUMN design_id UUID REFERENCES public.designs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products (public catalog)
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone" 
ON public.products FOR SELECT 
USING (status = 'active');

-- Allow admins to manage products
DROP POLICY IF EXISTS "Service role can manage products" ON public.products;
CREATE POLICY "Service role can manage products" 
ON public.products FOR ALL 
TO service_role
USING (true);

-- Product variants are viewable by everyone
DROP POLICY IF EXISTS "Product variants are viewable by everyone" ON public.product_variants;
CREATE POLICY "Product variants are viewable by everyone" 
ON public.product_variants FOR SELECT 
USING (true);

-- Allow admins to manage product variants
DROP POLICY IF EXISTS "Service role can manage variants" ON public.product_variants;
CREATE POLICY "Service role can manage variants" 
ON public.product_variants FOR ALL 
TO service_role
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);