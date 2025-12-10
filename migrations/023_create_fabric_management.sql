-- =====================================================
-- FABRIC MANAGEMENT SYSTEM
-- Creates fabric table and adds fabric_id to products
-- =====================================================

-- Create fabrics table
CREATE TABLE IF NOT EXISTS fabrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    code VARCHAR(50) UNIQUE, -- Optional fabric code/SKU
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add fabric_id column to products table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'fabric_id'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN fabric_id UUID REFERENCES fabrics(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_products_fabric_id ON products(fabric_id);
        
        COMMENT ON COLUMN products.fabric_id IS 'Reference to fabric used in this product';
    END IF;
END $$;

-- Create indexes for fabrics table
CREATE INDEX IF NOT EXISTS idx_fabrics_name ON fabrics(name);
CREATE INDEX IF NOT EXISTS idx_fabrics_code ON fabrics(code);
CREATE INDEX IF NOT EXISTS idx_fabrics_is_active ON fabrics(is_active);
CREATE INDEX IF NOT EXISTS idx_fabrics_created_at ON fabrics(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fabric_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for fabrics table
DROP TRIGGER IF EXISTS trigger_update_fabrics_timestamp ON fabrics;
CREATE TRIGGER trigger_update_fabrics_timestamp
    BEFORE UPDATE ON fabrics
    FOR EACH ROW
    EXECUTE FUNCTION update_fabric_updated_at();

-- Insert some sample fabrics
INSERT INTO fabrics (name, description, code, is_active) VALUES
    ('Cotton', '100% pure cotton fabric, soft and breathable', 'FAB-COT-001', true),
    ('Polyester', 'Durable synthetic fabric, wrinkle-resistant', 'FAB-POL-001', true),
    ('Silk', 'Luxurious natural silk fabric', 'FAB-SIL-001', true),
    ('Linen', 'Natural linen fabric, cool and comfortable', 'FAB-LIN-001', true),
    ('Denim', 'Heavy-duty cotton denim fabric', 'FAB-DEN-001', true),
    ('Chiffon', 'Lightweight, sheer fabric', 'FAB-CHI-001', true),
    ('Georgette', 'Lightweight, crinkled fabric', 'FAB-GEO-001', true),
    ('Rayon', 'Semi-synthetic fabric, soft and smooth', 'FAB-RAY-001', true)
ON CONFLICT (name) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE fabrics IS 'Stores fabric types available for products';
COMMENT ON COLUMN fabrics.name IS 'Fabric name (e.g., Cotton, Silk, Polyester)';
COMMENT ON COLUMN fabrics.code IS 'Optional fabric code or SKU';
COMMENT ON COLUMN fabrics.is_active IS 'Whether this fabric is currently available for selection';

