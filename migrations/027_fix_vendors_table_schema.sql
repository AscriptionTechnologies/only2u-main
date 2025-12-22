-- Migration: Fix Vendors Table Schema and Permissions
-- Description: Ensures vendors table has all required columns and proper RLS policies for Admin access.

-- 1. Ensure columns exist
DO $$ 
BEGIN
  -- Add profile_image_url if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'profile_image_url') THEN
    ALTER TABLE vendors ADD COLUMN profile_image_url TEXT;
  END IF;

  -- Add location if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'location') THEN
    ALTER TABLE vendors ADD COLUMN location TEXT;
  END IF;

  -- Add contact_email if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'contact_email') THEN
    ALTER TABLE vendors ADD COLUMN contact_email VARCHAR(255);
  END IF;

  -- Add contact_phone if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'contact_phone') THEN
    ALTER TABLE vendors ADD COLUMN contact_phone VARCHAR(50);
  END IF;

  -- Add is_verified if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'is_verified') THEN
    ALTER TABLE vendors ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;

  -- Add business_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'business_name') THEN
    ALTER TABLE vendors ADD COLUMN business_name VARCHAR(255);
  END IF;
END $$;

-- 2. Setup RLS Policies
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
DROP POLICY IF EXISTS "Admins can manage all vendors" ON vendors;
CREATE POLICY "Admins can manage all vendors" 
ON vendors 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Public read access (optional, if needed for storefront?)
-- For now, let's allow authenticated users to view vendors (basic info)
DROP POLICY IF EXISTS "Authenticated users can view vendors" ON vendors;
CREATE POLICY "Authenticated users can view vendors" 
ON vendors 
FOR SELECT 
USING (auth.role() = 'authenticated');
