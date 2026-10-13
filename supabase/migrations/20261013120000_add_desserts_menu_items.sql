-- Desserts stay on the Pan Asian cuisine and the existing Desserts category.
-- Sesame Ice Cream with Honey is intentionally not included.

INSERT INTO public."Category" (name)
SELECT 'Desserts'
WHERE NOT EXISTS (
  SELECT 1 FROM public."Category" WHERE name = 'Desserts'
);

INSERT INTO public."MenuItem" (
  title,
  description,
  price,
  "categoryId",
  order_type,
  cuisine
)
SELECT
  dessert.title,
  dessert.description,
  dessert.price,
  category.id,
  'on_demand',
  'Pan Asian'
FROM (
  VALUES
    ('Mango Sticky Rice', 'Sweet mango slices with coconut sticky rice.', 239),
    ('Wanton Dates', 'Crispy wonton filled with sweet dates.', 239),
    ('Water Chestnut', 'Crunchy water chestnuts in light syrup and ice.', 349)
) AS dessert(title, description, price)
JOIN public."Category" AS category
  ON category.name = 'Desserts'
WHERE NOT EXISTS (
  SELECT 1
  FROM public."MenuItem" AS menu_item
  WHERE menu_item.title = dessert.title
    AND menu_item.cuisine = 'Pan Asian'
    AND menu_item."categoryId" = category.id
);

UPDATE public."MenuItem"
SET "imageUrl" = '/images/menuimages/mango-sticky-rice.jpg'
WHERE title = 'Mango Sticky Rice'
  AND cuisine = 'Pan Asian'
  AND ("imageUrl" IS NULL OR "imageUrl" = '');

UPDATE public."MenuItem"
SET "imageUrl" = '/images/menuimages/wanton-dates.jpg'
WHERE title = 'Wanton Dates'
  AND cuisine = 'Pan Asian'
  AND ("imageUrl" IS NULL OR "imageUrl" = '');

UPDATE public."MenuItem"
SET "imageUrl" = '/images/menuimages/water-chestnut.jpg'
WHERE title = 'Water Chestnut'
  AND cuisine = 'Pan Asian'
  AND ("imageUrl" IS NULL OR "imageUrl" = '');
