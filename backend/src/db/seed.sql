INSERT INTO customers (id, full_name, phone, email)
VALUES
  (
    1,
    'Nguyen Van A',
    '0901234567',
    'nguyenvana@example.com'
  ),
  (
    2,
    'Tran Thi B',
    '0902345678',
    'tranthib@example.com'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, sku, name, base_price, category)
VALUES
  (
    1,
    'TSHIRT-001',
    'Classic T-Shirt',
    199000.00,
    'apparel'
  ),
  (
    2,
    'HOODIE-001',
    'Black Hoodie',
    499000.00,
    'apparel'
  ),
  (
    3,
    'TOTE-001',
    'Canvas Tote Bag',
    149000.00,
    'accessories'
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
  )
ON CONFLICT DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('customers', 'id'),
  COALESCE((SELECT MAX(id) FROM customers), 1),
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
