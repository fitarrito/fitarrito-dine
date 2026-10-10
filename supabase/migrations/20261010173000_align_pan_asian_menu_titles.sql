-- Join key is MenuItem.title = pan_asian_price_options.dish_title
-- and pan_asian_ingredients.dish_title. No foreign key exists.
-- Align the existing Ramen row and add the three dishes that already
-- have price and ingredient rows but no MenuItem record.
-- Thai Green Curry stays in MenuItem and is unchanged.

UPDATE public."MenuItem"
SET
  title = 'Japanese Ramen',
  description = 'Umami rich ramen broth with noodles, veggies and your choice of ingredients.'
WHERE id = 25
  AND title = 'Ramen'
  AND cuisine = 'Pan Asian';

INSERT INTO public."MenuItem" (
  title,
  description,
  price,
  "imageUrl",
  order_type,
  cuisine
)
SELECT
  dish.title,
  dish.description,
  dish.price,
  dish.image_url,
  'on_demand',
  'Pan Asian'
FROM (
  VALUES
    (
      'Korean Bibimbap',
      'Korean rice bowl with veggies, gochujang sauce and your choice of ingredients.',
      349,
      '/images/menuimages/korean-bibimbap.jpg'
    ),
    (
      'Tom Yum Noodle Bowl',
      'Spicy & sour Thai broth with noodles, veggies, lemongrass and herbs.',
      349,
      '/images/menuimages/tom-yum-noodle-bowl.jpg'
    ),
    (
      'Malatang',
      'Customize your bowl with fresh ingredients in our signature mala broth.',
      459,
      '/images/menuimages/malatang.jpg'
    )
) AS dish(title, description, price, image_url)
WHERE NOT EXISTS (
  SELECT 1
  FROM public."MenuItem" AS menu_item
  WHERE menu_item.cuisine = 'Pan Asian'
    AND menu_item.title = dish.title
);
