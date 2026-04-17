INSERT INTO customers (
  id,
  full_name,
  phone,
  email,
  password_hash,
  role,
  abuse_score,
  is_blacklisted
)
VALUES
  (
    1,
    'Nguyen Van A',
    '0901234567',
    'nguyenvana@example.com',
    '$2b$10$2nXovS6fkWMqsQzXWNzB1.0/R2y/SNO2V1/OqdwBnCKV6hzJpqLOS',
    'customer',
    0,
    FALSE
  ),
  (
    2,
    'Tran Thi B',
    '0902345678',
    'tranthib@example.com',
    '$2b$10$2nXovS6fkWMqsQzXWNzB1.0/R2y/SNO2V1/OqdwBnCKV6hzJpqLOS',
    'customer',
    1,
    FALSE
  ),
  (
    3,
    'Admin Demo',
    '0903000001',
    'admin@example.com',
    '$2b$10$2nXovS6fkWMqsQzXWNzB1.0/R2y/SNO2V1/OqdwBnCKV6hzJpqLOS',
    'admin',
    0,
    FALSE
  ),
  (
    4,
    'Staff Demo',
    '0903000002',
    'staff@example.com',
    '$2b$10$2nXovS6fkWMqsQzXWNzB1.0/R2y/SNO2V1/OqdwBnCKV6hzJpqLOS',
    'staff',
    0,
    FALSE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, slug)
VALUES
  (1, 'Apparel', 'apparel'),
  (2, 'Accessories', 'accessories'),
  (3, 'General', 'general')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, sku, name, base_price, category, category_id)
VALUES
  (
    1,
    'TSHIRT-001',
    'Classic T-Shirt',
    199000.00,
    'apparel',
    1
  ),
  (
    2,
    'HOODIE-001',
    'Black Hoodie',
    499000.00,
    'apparel',
    1
  ),
  (
    3,
    'TOTE-001',
    'Canvas Tote Bag',
    149000.00,
    'accessories',
    2
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (product_id, stock_qty, reserved_qty, min_stock_level, ads, doi)
VALUES
  (1, 20, 0, 5, 2.50, 8),
  (2, 10, 0, 3, 1.20, 12),
  (3, 30, 0, 5, 3.10, 6)
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO customer_addresses (
  customer_id,
  label,
  receiver_name,
  receiver_phone,
  address_line,
  ward,
  district,
  city,
  country,
  postal_code,
  is_default
)
VALUES
  (
    1,
    'home',
    'Nguyen Van A',
    '0901234567',
    '123 Nguyen Trai',
    'Ward 2',
    'District 5',
    'Ho Chi Minh City',
    'Vietnam',
    '700000',
    TRUE
  ),
  (
    1,
    'office',
    'Nguyen Van A',
    '0911111111',
    '45 Le Loi',
    'Ben Nghe',
    'District 1',
    'Ho Chi Minh City',
    'Vietnam',
    '700000',
    FALSE
  ),
  (
    2,
    'home',
    'Tran Thi B',
    '0902345678',
    '88 Tran Phu',
    'Hai Chau 1',
    'Hai Chau',
    'Da Nang',
    'Vietnam',
    '550000',
    TRUE
  ),
  (
    3,
    'office',
    'Admin Demo',
    '0903000001',
    '1 Admin Street',
    'Ben Nghe',
    'District 1',
    'Ho Chi Minh City',
    'Vietnam',
    '700000',
    TRUE
  ),
  (
    4,
    'office',
    'Staff Demo',
    '0903000002',
    '2 Staff Street',
    'Hai Chau 1',
    'Hai Chau',
    'Da Nang',
    'Vietnam',
    '550000',
    TRUE
  )
ON CONFLICT DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('customers', 'id'),
  COALESCE((SELECT MAX(id) FROM customers), 1),
  true
);

SELECT setval(
  pg_get_serial_sequence('categories', 'id'),
  COALESCE((SELECT MAX(id) FROM categories), 1),
  true
);

SELECT setval(
  pg_get_serial_sequence('products', 'id'),
  COALESCE((SELECT MAX(id) FROM products), 1),
  true
);

SELECT setval(
  pg_get_serial_sequence('inventory', 'id'),
  COALESCE((SELECT MAX(id) FROM inventory), 1),
  true
);

SELECT setval(
  pg_get_serial_sequence('customer_addresses', 'id'),
  COALESCE((SELECT MAX(id) FROM customer_addresses), 1),
  true
);
