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
