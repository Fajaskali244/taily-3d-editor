-- Create enum for catalog item kinds
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catalog_item_kind') THEN
        CREATE TYPE public.catalog_item_kind AS ENUM ('keyring', 'bead', 'charm');
    END IF;
END$$;

-- Create catalog_items table
CREATE TABLE IF NOT EXISTS public.catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind public.catalog_item_kind NOT NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL, -- Price in IDR (smallest unit)
    glb_path TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    height_mm NUMERIC,
    tags TEXT[] DEFAULT '{}',
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_catalog_items_kind_price ON public.catalog_items (kind, price);
CREATE INDEX IF NOT EXISTS idx_catalog_items_tags ON public.catalog_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_catalog_items_slug ON public.catalog_items (slug);

-- Enable Row Level Security
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to catalog" ON public.catalog_items;
DROP POLICY IF EXISTS "Allow service role full access to catalog" ON public.catalog_items;

-- RLS Policies
-- 1. Allow anyone (including anon) to read catalog items
CREATE POLICY "Allow public read access to catalog"
  ON public.catalog_items
  FOR SELECT
  USING (true);

-- 2. Allow only service_role to modify catalog
CREATE POLICY "Allow service role full access to catalog"
  ON public.catalog_items
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create get_catalog_items function
CREATE OR REPLACE FUNCTION public.get_catalog_items()
RETURNS TABLE (
  id UUID,
  kind TEXT,
  name TEXT,
  price INTEGER,
  glb_path TEXT,
  thumbnail TEXT,
  height_mm NUMERIC,
  tags TEXT[],
  slug TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT 
    id, kind::TEXT, name, price, glb_path, thumbnail, 
    height_mm, tags, slug, created_at, updated_at
  FROM public.catalog_items
  ORDER BY kind, price;
$$;

-- Insert existing catalog data with slugs
INSERT INTO public.catalog_items (slug, kind, name, price, glb_path, thumbnail, height_mm, tags)
VALUES
  ('keyring-basic', 'keyring', 'Basic Keyring', 25000, '/models/keyring.glb', '/src/assets/basic-keyring-new.png', 2, ARRAY['basic', 'metal']),
  ('keyring-premium', 'keyring', 'Premium Keyring', 35000, '/models/keyring-premium.glb', '/src/assets/premium-keyring-new.png', 2.5, ARRAY['premium', 'metal', 'gold']),
  ('keyring-round', 'keyring', 'Round Keyring', 30000, '/models/keyring-round.glb', '/src/assets/round-keyring.png', 2, ARRAY['round', 'metal', 'simple']),
  ('keyring-carabiner', 'keyring', 'Carabiner Keyring', 40000, '/models/keyring-carabiner.glb', '/src/assets/carabiner-keyring.png', 3, ARRAY['carabiner', 'metal', 'secure']),
  ('bead-pink-cat-eye', 'bead', 'Pink Cat Eye Bead', 8000, '/models/beads/pink-cat-eye.glb', '/src/assets/pink-cat-eye-bead.png', 12, ARRAY['cat eye', 'pink', 'stone']),
  ('bead-blue-glitter', 'bead', 'Blue Glitter Bead', 10000, '/models/beads/blue-glitter.glb', '/src/assets/blue-glitter-beads-new.png', 12, ARRAY['glitter', 'blue', 'sparkle']),
  ('bead-owl', 'bead', 'Owl Face Bead', 12000, '/models/beads/owl.glb', '/src/assets/owl-face-bead-new.png', 15, ARRAY['owl', 'animal', 'cute']),
  ('bead-sports-collection', 'bead', 'Sports Beads Collection', 11000, '/models/beads/sports-collection.glb', '/src/assets/sports-beads-collection.png', 12, ARRAY['sports', 'basketball', 'soccer', 'baseball', 'football']),
  ('bead-black-cat', 'bead', 'Black Cat Bead', 13000, '/models/beads/black-cat.glb', '/src/assets/black-cat-bead.png', 15, ARRAY['cat', 'animal', 'black', 'blue eyes']),
  ('bead-blue-flower', 'bead', 'Blue Flower Bead', 10000, '/models/beads/blue-flower.glb', '/src/assets/blue-flower-bead.png', 12, ARRAY['flower', 'blue', 'nature']),
  ('bead-crescent-moon', 'bead', 'Crescent Moon Beads', 9000, '/models/beads/crescent-moon.glb', '/src/assets/crescent-moon-beads.png', 10, ARRAY['moon', 'crescent', 'celestial', 'blue', 'gold']),
  ('charm-heart', 'charm', 'Heart Charm', 15000, '/models/charms/heart.glb', '/src/assets/heart-charm-new.png', 8, ARRAY['heart', 'love', 'cute']),
  ('charm-star', 'charm', 'Star Charm', 15000, '/models/charms/star.glb', '/src/assets/star-charm-new.png', 8, ARRAY['star', 'celestial', 'shine']),
  ('charm-moon', 'charm', 'Moon Charm', 18000, '/models/charms/moon.glb', '/src/assets/moon-charm-new.png', 10, ARRAY['moon', 'celestial', 'crescent']),
  ('charm-four-point-star', 'charm', 'Four-Point Star Charm', 16000, '/models/charms/four-point-star.glb', '/src/assets/star-charm-four-point.png', 9, ARRAY['star', 'four-point', 'celestial', 'elegant']),
  ('charm-dripping-heart', 'charm', 'Dripping Heart Charm', 20000, '/models/charms/dripping-heart.glb', '/src/assets/dripping-heart-charm.png', 12, ARRAY['heart', 'dripping', 'black', 'gothic', 'edgy'])
ON CONFLICT (slug) DO NOTHING;