-- Update designs table to match the expected structure
ALTER TABLE public.designs 
DROP COLUMN IF EXISTS design_data_url,
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS params JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;