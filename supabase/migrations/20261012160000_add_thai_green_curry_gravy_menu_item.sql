-- Price rows for Thai Green Curry already exist in
-- public.asian_starters_gravy_prices. The Pan Asian MenuItem with the
-- same title stays unchanged. This adds the gravy dish under the new cuisine.

INSERT INTO public."MenuItem" (
  title,
  description,
  price,
  "imageUrl",
  "categoryId",
  order_type,
  cuisine
)
SELECT
  'Thai Green Curry',
  'Aromatic Thai green curry with vegetables and fragrant herbs.',
  299,
  '/images/menuimages/thai-green-curry.png',
  12,
  'on_demand',
  'Asian Starters & Gravy'
WHERE NOT EXISTS (
  SELECT 1
  FROM public."MenuItem" AS menu_item
  WHERE menu_item.title = 'Thai Green Curry'
    AND menu_item.cuisine = 'Asian Starters & Gravy'
);
