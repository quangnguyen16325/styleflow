CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  role VARCHAR(30) NOT NULL DEFAULT 'customer' CHECK (
    role IN ('customer', 'admin', 'staff')
  ),
  abuse_score INTEGER NOT NULL DEFAULT 0 CHECK (abuse_score >= 0),
  is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL DEFAULT 'home',
  receiver_name VARCHAR(255) NOT NULL,
  receiver_phone VARCHAR(50) NOT NULL,
  address_line TEXT NOT NULL,
  ward VARCHAR(120),
  district VARCHAR(120),
  city VARCHAR(120) NOT NULL,
  country VARCHAR(120) NOT NULL DEFAULT 'Vietnam',
  postal_code VARCHAR(30),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  base_price NUMERIC(12, 2) NOT NULL CHECK (base_price >= 0),
  category VARCHAR(100) NOT NULL DEFAULT 'general',
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  reserved_qty INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  min_stock_level INTEGER NOT NULL DEFAULT 5 CHECK (min_stock_level >= 0),
  ads NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (ads >= 0),
  doi INTEGER NOT NULL DEFAULT 0 CHECK (doi >= 0),
  last_calculated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id BIGSERIAL PRIMARY KEY,
  inventory_id BIGINT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  change_amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (
    type IN ('RESERVE', 'SALE', 'RESTOCK', 'RETURN', 'EXPIRED_CANCEL')
  ),
  order_id BIGINT,
  created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  reference_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  customer_address_id BIGINT REFERENCES customer_addresses(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'awaiting_payment', 'paid', 'processing', 'shipping', 'completed', 'cancelled', 'failed')
  ),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (
    payment_status IN (
      'unpaid',
      'payment_pending',
      'payment_unknown',
      'paid',
      'paid_held',
      'payment_failed',
      'refunded',
      'refund_pending'
    )
  ),
  payment_gateway VARCHAR(50),
  transaction_ref VARCHAR(120),
  victim_notified BOOLEAN NOT NULL DEFAULT FALSE,
  incident_id VARCHAR(120),
  delivery_partner VARCHAR(80),
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    delivery_status IN (
      'pending',
      'ready_to_ship',
      'handover',
      'in_transit',
      'delivery_failed',
      'retry_pending',
      'returning',
      'returned',
      'delivered'
    )
  ),
  delivery_fail_count INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fail_count >= 0),
  last_delivery_failed_reason TEXT,
  address_change_status VARCHAR(50) NOT NULL DEFAULT 'none' CHECK (
    address_change_status IN (
      'none',
      'requested',
      'approved',
      'rejected',
      'rejected_timeout'
    )
  ),
  address_change_requested_at TIMESTAMPTZ,
  address_change_payload JSONB,
  address_change_fee_delta NUMERIC(10, 2),
  shipping_fee_approved BOOLEAN NOT NULL DEFAULT FALSE,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  payment_expires_at TIMESTAMPTZ,
  fail_count INTEGER NOT NULL DEFAULT 0 CHECK (fail_count >= 0),
  shipping_receiver_name VARCHAR(255),
  shipping_receiver_phone VARCHAR(50),
  shipping_address_line TEXT,
  shipping_ward VARCHAR(120),
  shipping_district VARCHAR(120),
  shipping_address TEXT NOT NULL,
  city VARCHAR(120) NOT NULL,
  shipping_country VARCHAR(120) NOT NULL DEFAULT 'Vietnam',
  shipping_postal_code VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_events (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  partner VARCHAR(80),
  external_event_id VARCHAR(120),
  status VARCHAR(50) NOT NULL,
  reason TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_logs (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  incident_id VARCHAR(120),
  external_event_id VARCHAR(120),
  gateway_name VARCHAR(50) NOT NULL,
  transaction_ref VARCHAR(120),
  source VARCHAR(50) NOT NULL,
  http_status INTEGER,
  error_code VARCHAR(80),
  payment_status VARCHAR(50),
  raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_config (
  id BIGSERIAL PRIMARY KEY,
  config_group VARCHAR(80) NOT NULL,
  config_key VARCHAR(120) NOT NULL UNIQUE,
  config_value TEXT,
  config_type VARCHAR(50) NOT NULL DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'manual_review_required',
      'approved',
      'rejected',
      'refunded'
    )
  ),
  abuse_score_snapshot INTEGER NOT NULL DEFAULT 0 CHECK (abuse_score_snapshot >= 0),
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issues (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (
    type IN ('ORDER_FAILED', 'DELIVERY_FAILED', 'LOW_STOCK', 'PAYMENT_ERROR', 'ABUSE_RISK', 'MANUAL_REVIEW')
  ),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'investigating', 'resolved', 'ignored')
  ),
  log_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC(12, 2) NOT NULL CHECK (price_at_purchase >= 0)
);

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'customer';

UPDATE customers
SET role = 'customer'
WHERE role IS NULL;

ALTER TABLE customers
ALTER COLUMN role SET DEFAULT 'customer';

ALTER TABLE customers
ALTER COLUMN role SET NOT NULL;

ALTER TABLE customers
DROP CONSTRAINT IF EXISTS customers_role_check;

ALTER TABLE customers
ADD CONSTRAINT customers_role_check CHECK (
  role IN ('customer', 'admin', 'staff')
);

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_address_id BIGINT REFERENCES customer_addresses(id) ON DELETE SET NULL;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid';

UPDATE orders
SET payment_status = 'paid'
WHERE status IN ('paid', 'processing', 'shipping', 'completed')
  AND payment_status IS NULL;

UPDATE orders
SET payment_status = 'payment_failed'
WHERE status = 'failed'
  AND payment_status IS NULL;

UPDATE orders
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;

ALTER TABLE orders
ALTER COLUMN payment_status SET DEFAULT 'unpaid';

ALTER TABLE orders
ALTER COLUMN payment_status SET NOT NULL;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check CHECK (
  payment_status IN (
    'unpaid',
    'payment_pending',
    'payment_unknown',
    'paid',
    'paid_held',
    'payment_failed',
    'refunded',
    'refund_pending'
  )
);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS transaction_ref VARCHAR(120);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS victim_notified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS incident_id VARCHAR(120);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_partner VARCHAR(80);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending';

UPDATE orders
SET delivery_status = CASE
  WHEN status = 'shipping' THEN 'in_transit'
  WHEN status = 'completed' THEN 'delivered'
  WHEN status = 'failed' THEN 'delivery_failed'
  ELSE 'pending'
END
WHERE delivery_status IS NULL;

UPDATE orders
SET delivery_status = 'pending'
WHERE delivery_status IS NULL;

ALTER TABLE orders
ALTER COLUMN delivery_status SET DEFAULT 'pending';

ALTER TABLE orders
ALTER COLUMN delivery_status SET NOT NULL;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_delivery_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_delivery_status_check CHECK (
  delivery_status IN (
    'pending',
    'ready_to_ship',
    'handover',
    'in_transit',
    'delivery_failed',
    'retry_pending',
    'returning',
    'returned',
    'delivered'
  )
);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_fail_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS last_delivery_failed_reason TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS address_change_status VARCHAR(50) DEFAULT 'none';

UPDATE orders
SET address_change_status = 'none'
WHERE address_change_status IS NULL;

ALTER TABLE orders
ALTER COLUMN address_change_status SET DEFAULT 'none';

ALTER TABLE orders
ALTER COLUMN address_change_status SET NOT NULL;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_address_change_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_address_change_status_check CHECK (
  address_change_status IN (
    'none',
    'requested',
    'approved',
    'rejected',
    'rejected_timeout'
  )
);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS address_change_requested_at TIMESTAMPTZ;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS address_change_payload JSONB;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS address_change_fee_delta NUMERIC(10, 2);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_fee_approved BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_receiver_name VARCHAR(255);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_receiver_phone VARCHAR(50);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_address_line TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_ward VARCHAR(120);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_district VARCHAR(120);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(120) NOT NULL DEFAULT 'Vietnam';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(30);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;

INSERT INTO categories (name, slug)
VALUES
  ('Apparel', 'apparel'),
  ('Accessories', 'accessories'),
  ('General', 'general')
ON CONFLICT (slug) DO NOTHING;

UPDATE products p
SET category_id = c.id
FROM categories c
WHERE p.category_id IS NULL
  AND LOWER(TRIM(p.category)) = c.slug;

ALTER TABLE payment_logs
ADD COLUMN IF NOT EXISTS external_event_id VARCHAR(120);

ALTER TABLE refund_requests
ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE refund_requests
ADD COLUMN IF NOT EXISTS abuse_score_snapshot INTEGER DEFAULT 0;

UPDATE refund_requests
SET abuse_score_snapshot = 0
WHERE abuse_score_snapshot IS NULL;

ALTER TABLE refund_requests
ALTER COLUMN abuse_score_snapshot SET DEFAULT 0;

ALTER TABLE refund_requests
ALTER COLUMN abuse_score_snapshot SET NOT NULL;

ALTER TABLE refund_requests
DROP CONSTRAINT IF EXISTS refund_requests_status_check;

ALTER TABLE refund_requests
ADD CONSTRAINT refund_requests_status_check CHECK (
  status IN (
    'pending',
    'manual_review_required',
    'approved',
    'rejected',
    'refunded'
  )
);

ALTER TABLE issues
DROP CONSTRAINT IF EXISTS issues_type_check;

ALTER TABLE issues
ADD CONSTRAINT issues_type_check CHECK (
  type IN ('ORDER_FAILED', 'DELIVERY_FAILED', 'LOW_STOCK', 'PAYMENT_ERROR', 'ABUSE_RISK', 'MANUAL_REVIEW')
);

UPDATE orders
SET
  shipping_receiver_name = COALESCE(shipping_receiver_name, ''),
  shipping_receiver_phone = COALESCE(shipping_receiver_phone, ''),
  shipping_address_line = COALESCE(shipping_address_line, shipping_address)
WHERE shipping_receiver_name IS NULL
   OR shipping_receiver_phone IS NULL
   OR shipping_address_line IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_role ON customers(role);
CREATE INDEX IF NOT EXISTS idx_customers_blacklisted ON customers(is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_city ON customer_addresses(city);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_addresses_default_per_customer
ON customer_addresses(customer_id)
WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order_id ON inventory_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_inventory_transactions_dedupe
ON inventory_transactions(inventory_id, type, order_id, reference_id);
CREATE INDEX IF NOT EXISTS idx_issues_order_id ON issues(order_id);
CREATE INDEX IF NOT EXISTS idx_issues_product_id ON issues(product_id);
CREATE INDEX IF NOT EXISTS idx_issues_type ON issues(type);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_delivery_events_order_id ON delivery_events(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_status ON delivery_events(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_address_id ON orders(customer_address_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_ref ON orders(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_orders_incident_id ON orders(incident_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_gateway_name ON payment_logs(gateway_name);
CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction_ref ON payment_logs(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payment_logs_incident_id ON payment_logs(incident_id);
DROP INDEX IF EXISTS uniq_payment_logs_external_event_id;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_logs_external_event_id
ON payment_logs(external_event_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_customer_id ON refund_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
