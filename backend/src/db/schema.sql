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

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  base_price NUMERIC(12, 2) NOT NULL CHECK (base_price >= 0),
  category VARCHAR(100) NOT NULL DEFAULT 'general',
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
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'awaiting_payment', 'paid', 'processing', 'shipping', 'completed', 'cancelled', 'failed')
  ),
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  payment_expires_at TIMESTAMPTZ,
  fail_count INTEGER NOT NULL DEFAULT 0 CHECK (fail_count >= 0),
  shipping_address TEXT NOT NULL,
  city VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issues (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (
    type IN ('ORDER_FAILED', 'LOW_STOCK', 'PAYMENT_ERROR', 'ABUSE_RISK', 'MANUAL_REVIEW')
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

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_role ON customers(role);
CREATE INDEX IF NOT EXISTS idx_customers_blacklisted ON customers(is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_city ON customer_addresses(city);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_addresses_default_per_customer
ON customer_addresses(customer_id)
WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order_id ON inventory_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_issues_order_id ON issues(order_id);
CREATE INDEX IF NOT EXISTS idx_issues_product_id ON issues(product_id);
CREATE INDEX IF NOT EXISTS idx_issues_type ON issues(type);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
