INSERT INTO products (id, name, description, price, image_url, stock)
VALUES
  (
    'prod_001',
    'Classic T-Shirt',
    'Cotton t-shirt',
    199000,
    'https://cdn.example.com/products/shirt-1.jpg',
    20
  ),
  (
    'prod_002',
    'Black Hoodie',
    'Fleece hoodie',
    499000,
    'https://cdn.example.com/products/hoodie-1.jpg',
    10
  ),
  (
    'prod_003',
    'Canvas Tote Bag',
    'Everyday tote bag',
    149000,
    'https://cdn.example.com/products/tote-1.jpg',
    30
  )
ON CONFLICT (id) DO NOTHING;
