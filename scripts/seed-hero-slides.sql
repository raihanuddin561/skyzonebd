-- Sample hero slides data
-- To run this, you can use Prisma Studio or run directly in your database

-- First, let's add a few hero slides
INSERT INTO hero_slides (id, title, subtitle, image_url, link_url, product_id, button_text, position, is_active, bg_color, text_color, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(),
    'Summer Electronics Sale',
    'Up to 50% off on premium electronics',
    'https://images.unsplash.com/photo-1550009158-9ebf69173e03',
    '/products',
    NULL,
    'Shop Now',
    1,
    true,
    '#3B82F6',
    '#FFFFFF',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Baby Care Essentials',
    'Everything your little one needs',
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4',
    '/categories/baby-items',
    NULL,
    'Explore Now',
    2,
    true,
    '#EC4899',
    '#FFFFFF',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Smart Home Devices',
    'Make your home intelligent',
    'https://images.unsplash.com/photo-1558002038-1055907df827',
    '/categories/electronics',
    NULL,
    'View Collection',
    3,
    true,
    '#8B5CF6',
    '#FFFFFF',
    NOW(),
    NOW()
  );

-- Or you can create slides with product links
-- First get some product IDs:
-- SELECT id, name FROM products LIMIT 5;

-- Then insert with product reference:
-- INSERT INTO hero_slides (id, title, subtitle, image_url, link_url, product_id, button_text, position, is_active, bg_color, text_color, created_at, updated_at)
-- VALUES (
--   gen_random_uuid(),
--   'Featured Product Name',
--   'Special offer just for you',
--   'https://example.com/product-image.jpg',
--   '/products/PRODUCT_ID_HERE',
--   'PRODUCT_ID_HERE',
--   'Buy Now',
--   4,
--   true,
--   '#10B981',
--   '#FFFFFF',
--   NOW(),
--   NOW()
-- );
