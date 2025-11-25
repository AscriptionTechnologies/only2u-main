-- Migration: Create coupons table
-- Description: Adds a coupons table for managing promotional codes within the admin panel
-- Generated: 2025-11-09

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 0),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  per_user_limit INTEGER CHECK (per_user_limit IS NULL OR per_user_limit >= 0),
  min_order_value NUMERIC(10, 2) CHECK (min_order_value IS NULL OR min_order_value >= 0),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes to speed up lookups and filtering
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons (is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_start_end ON coupons (start_date, end_date);

-- Comment for documentation
COMMENT ON TABLE coupons IS 'Stores promotional coupon codes with metadata and usage tracking.';

SELECT 'Coupons table created successfully' AS status;

