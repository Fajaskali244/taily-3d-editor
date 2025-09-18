-- Taily Phase 1: Core Database Schema
-- Create core tables for products, designs, cart, and orders

-- Products and variants
CREATE TABLE public.products (
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

CREATE TABLE public.product_variants (
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

-- User designs
CREATE TABLE public.designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  preview_url TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cart functionality (already exists, but ensure it has design_id reference)
-- Note: cart_items table already exists, adding design_id if not present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'design_id'
  ) THEN
    ALTER TABLE public.cart_items ADD COLUMN design_id UUID REFERENCES public.designs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Orders table (enhanced from existing)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_price NUMERIC(12,2) NOT NULL,
  shipping_address JSONB,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  fulfillment_status TEXT CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'shipped', 'delivered')) DEFAULT 'unfulfilled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  design_id UUID REFERENCES public.designs(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Products are viewable by everyone (public catalog)
CREATE POLICY "Products are viewable by everyone" 
ON public.products FOR SELECT 
USING (status = 'active');

-- Product variants are viewable by everyone
CREATE POLICY "Product variants are viewable by everyone" 
ON public.product_variants FOR SELECT 
USING (true);

-- Designs: users can manage their own, published designs are viewable by everyone
CREATE POLICY "Users can create their own designs" 
ON public.designs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own designs" 
ON public.designs FOR SELECT 
USING (auth.uid() = user_id OR is_published = true);

CREATE POLICY "Users can update their own designs" 
ON public.designs FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own designs" 
ON public.designs FOR DELETE 
USING (auth.uid() = user_id);

-- Orders: users can only see their own orders
CREATE POLICY "Users can create their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

-- Order items: users can view items from their own orders
CREATE POLICY "Users can view their own order items" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_designs_user_id ON public.designs(user_id);
CREATE INDEX idx_designs_published ON public.designs(is_published) WHERE is_published = true;
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Create updated_at trigger for designs
CREATE TRIGGER update_designs_updated_at
  BEFORE UPDATE ON public.designs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();