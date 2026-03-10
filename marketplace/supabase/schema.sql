-- ============================================================
-- Marketplace Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Suppliers: one row per supplier
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('spreadsheet', 'api')),
  shipping_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  api_config JSONB,     -- for API suppliers: { base_url, auth_type, auth_value, field_map, pagination }
  column_map JSONB,     -- for CSV suppliers: { "CSV Column Name": "supplierSku|name|costPrice|..." }
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories with per-category margin
CREATE TABLE IF NOT EXISTS marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES marketplace_categories(id) ON DELETE SET NULL,
  margin_percentage DECIMAL(5,2) NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products (optimised for 100k+ rows)
CREATE TABLE IF NOT EXISTS marketplace_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  category_id UUID REFERENCES marketplace_categories(id) ON DELETE SET NULL,
  supplier_sku TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cost_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  images TEXT[] NOT NULL DEFAULT '{}',
  attributes JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, supplier_sku)
);

-- Full-text search index on name and description
CREATE INDEX IF NOT EXISTS mp_fts_idx ON marketplace_products
  USING GIN(to_tsvector('english', name || ' ' || coalesce(description, '')));

-- Standard lookup indexes
CREATE INDEX IF NOT EXISTS mp_category_idx ON marketplace_products(category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS mp_supplier_idx ON marketplace_products(supplier_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS mp_slug_idx ON marketplace_products(slug);
CREATE INDEX IF NOT EXISTS mp_active_created_idx ON marketplace_products(is_active, created_at DESC);

-- Marketplace customers (separate from POS)
CREATE TABLE IF NOT EXISTS marketplace_customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved customer addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES marketplace_customers(id) ON DELETE CASCADE,
  label TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postcode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'AU',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES marketplace_customers(id) ON DELETE SET NULL,
  guest_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_total DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  shipping_address JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mo_customer_idx ON marketplace_orders(customer_id);
CREATE INDEX IF NOT EXISTS mo_status_idx ON marketplace_orders(status);
CREATE INDEX IF NOT EXISTS mo_stripe_idx ON marketplace_orders(stripe_payment_intent_id);

-- Order line items
CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES marketplace_products(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS moi_order_idx ON marketplace_order_items(order_id);

-- Import job tracking
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('csv', 'api')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  products_imported INTEGER NOT NULL DEFAULT 0,
  products_updated INTEGER NOT NULL DEFAULT 0,
  products_failed INTEGER NOT NULL DEFAULT 0,
  error_log JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ij_supplier_idx ON import_jobs(supplier_id, created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Products: public read access
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active products" ON marketplace_products
  FOR SELECT USING (is_active = true);

-- Categories: public read
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read categories" ON marketplace_categories
  FOR SELECT USING (true);

-- Customers: users can only see their own record
ALTER TABLE marketplace_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profile" ON marketplace_customers
  FOR ALL USING (auth.uid() = id);

-- Addresses: users can only see their own
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own addresses" ON customer_addresses
  FOR ALL USING (auth.uid() = customer_id);

-- Orders: users can see their own orders
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own orders" ON marketplace_orders
  FOR SELECT USING (auth.uid() = customer_id);

ALTER TABLE marketplace_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own order items" ON marketplace_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_orders o
      WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
  );

-- Suppliers and import_jobs: service role only (admin)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to suppliers" ON suppliers FOR ALL USING (false);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to import_jobs" ON import_jobs FOR ALL USING (false);

-- ============================================================
-- Helper function: update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON marketplace_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Supabase Storage bucket for product images
-- Run separately in Supabase dashboard or add via API
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
