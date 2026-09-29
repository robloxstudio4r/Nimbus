-- Nimbus store schema for Cloudflare D1

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  price       INTEGER NOT NULL DEFAULT 0,   -- in cents
  image       TEXT DEFAULT '',
  stock       INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS carts (
  id         TEXT PRIMARY KEY,
  items      TEXT NOT NULL DEFAULT '[]',    -- JSON: [{productId, qty}]
  status     TEXT NOT NULL DEFAULT 'open',  -- open | fulfilled
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  number           TEXT NOT NULL,
  cart_id          TEXT,
  customer_name    TEXT DEFAULT '',
  customer_email   TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  items            TEXT NOT NULL,           -- JSON: [{productId, name, price, qty}]
  subtotal         INTEGER NOT NULL DEFAULT 0,
  shipping         INTEGER NOT NULL DEFAULT 0,
  tax              INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'paid',  -- paid | fulfilled | refunded
  card_brand       TEXT DEFAULT '',
  card_last4       TEXT DEFAULT '',
  payment_intent   TEXT DEFAULT '',
  created_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carts_updated  ON carts(updated_at DESC);

-- Seed products (id, name, description, price in cents, image, stock, created_at)
INSERT OR IGNORE INTO products (id, name, description, price, image, stock, created_at) VALUES
  ('prod_aurora_hoodie', 'Aurora Hoodie',      'Heavyweight fleece, unisex fit.',          4900, '', 25, 1700000000000),
  ('prod_slate_tee',     'Slate Tee',          'Pima cotton, pre-shrunk.',                 2400, '', 40, 1700000001000),
  ('prod_nimbus_cap',    'Nimbus Cap',         'Six-panel, adjustable strap.',             2800, '', 30, 1700000002000),
  ('prod_drift_bottle',  'Drift Bottle',       'Insulated 18oz stainless steel.',          3200, '', 22, 1700000003000),
  ('prod_echo_socks',    'Echo Socks (3pk)',   'Cushioned crew socks.',                    1800, '', 60, 1700000004000),
  ('prod_halo_tote',     'Halo Tote',          'Waxed canvas everyday carry.',             3600, '', 18, 1700000005000);
