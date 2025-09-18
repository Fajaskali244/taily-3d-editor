-- Seed data for Taily products
-- Insert sample keychain products and variants

INSERT INTO public.products (slug, name, description, default_price, thumbnail_url, min_thickness_mm, max_chars) VALUES
('nameplate-keychain', 'Custom Nameplate Keychain', 'Personalized acrylic nameplate keychain with custom text and colors', 25.00, '/lovable-uploads/nameplate-keychain.png', 2.0, 15),
('initial-tag', 'Monogram Initial Tag', 'Single letter initial tag with decorative font options', 18.00, '/lovable-uploads/initial-tag.png', 1.5, 1),
('pet-id-tag', 'Pet ID Tag', 'Custom pet identification tag with name and contact info', 22.00, '/lovable-uploads/pet-tag.png', 2.5, 25),
('zodiac-charm', 'Zodiac Sign Charm', 'Personalized zodiac constellation keychain', 28.00, '/lovable-uploads/zodiac-charm.png', 2.0, 20),
('logo-keychain', 'Custom Logo Keychain', 'Upload your own design or logo for a unique keychain', 35.00, '/lovable-uploads/logo-keychain.png', 3.0, 0);

-- Insert variants for each product (different materials and colors)
INSERT INTO public.product_variants (product_id, sku, name, base_price, material, color, ready_to_ship) VALUES
-- Nameplate Keychain variants
((SELECT id FROM public.products WHERE slug = 'nameplate-keychain'), 'NK-ACR-BLK', 'Black Acrylic', 25.00, 'acrylic', 'black', true),
((SELECT id FROM public.products WHERE slug = 'nameplate-keychain'), 'NK-ACR-WHT', 'White Acrylic', 25.00, 'acrylic', 'white', true),
((SELECT id FROM public.products WHERE slug = 'nameplate-keychain'), 'NK-ACR-CLR', 'Clear Acrylic', 27.00, 'acrylic', 'clear', false),
((SELECT id FROM public.products WHERE slug = 'nameplate-keychain'), 'NK-WOD-NAT', 'Natural Wood', 30.00, 'wood', 'natural', false),

-- Initial Tag variants
((SELECT id FROM public.products WHERE slug = 'initial-tag'), 'IT-MET-SLV', 'Silver Metal', 18.00, 'metal', 'silver', true),
((SELECT id FROM public.products WHERE slug = 'initial-tag'), 'IT-MET-GLD', 'Gold Metal', 20.00, 'metal', 'gold', false),
((SELECT id FROM public.products WHERE slug = 'initial-tag'), 'IT-ACR-BLK', 'Black Acrylic', 16.00, 'acrylic', 'black', true),

-- Pet ID Tag variants
((SELECT id FROM public.products WHERE slug = 'pet-id-tag'), 'PT-MET-SLV', 'Silver Metal', 22.00, 'metal', 'silver', true),
((SELECT id FROM public.products WHERE slug = 'pet-id-tag'), 'PT-MET-GLD', 'Gold Metal', 25.00, 'metal', 'gold', false),
((SELECT id FROM public.products WHERE slug = 'pet-id-tag'), 'PT-PLA-BLU', 'Blue Plastic', 18.00, 'plastic', 'blue', true),

-- Zodiac Charm variants
((SELECT id FROM public.products WHERE slug = 'zodiac-charm'), 'ZC-ACR-BLK', 'Black Acrylic', 28.00, 'acrylic', 'black', true),
((SELECT id FROM public.products WHERE slug = 'zodiac-charm'), 'ZC-ACR-CLR', 'Clear Acrylic', 30.00, 'acrylic', 'clear', false),

-- Logo Keychain variants
((SELECT id FROM public.products WHERE slug = 'logo-keychain'), 'LK-ACR-WHT', 'White Acrylic', 35.00, 'acrylic', 'white', false),
((SELECT id FROM public.products WHERE slug = 'logo-keychain'), 'LK-MET-SLV', 'Silver Metal', 45.00, 'metal', 'silver', false);