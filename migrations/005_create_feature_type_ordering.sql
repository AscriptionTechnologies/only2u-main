-- Migration: Create feature type ordering system
-- Date: 2025-10-15
-- Description: Allows admin to reorder which feature sections appear first on mobile app home screen

-- Create feature_sections table for managing section order
CREATE TABLE IF NOT EXISTS feature_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_type VARCHAR(50) UNIQUE NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default feature sections
INSERT INTO feature_sections (section_type, display_order, is_active, title, icon)
VALUES
  ('best_seller', 0, true, 'Best Sellers', '⭐'),
  ('trending', 1, true, 'Trending Now', '🔥'),
  ('categories', 2, true, 'Shop by Category', '📦')
ON CONFLICT (section_type) DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_feature_sections_display_order 
ON feature_sections(display_order);

CREATE INDEX IF NOT EXISTS idx_feature_sections_is_active 
ON feature_sections(is_active);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_feature_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_sections_timestamp
BEFORE UPDATE ON feature_sections
FOR EACH ROW
EXECUTE FUNCTION update_feature_sections_updated_at();

-- Verify the migration
SELECT 
  section_type,
  display_order,
  title,
  is_active
FROM feature_sections
ORDER BY display_order;

