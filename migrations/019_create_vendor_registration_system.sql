-- =====================================================
-- VENDOR REGISTRATION SYSTEM
-- Complete schema for vendor registration requests and vendor dashboard
-- =====================================================

-- Drop existing tables if they exist (for development)
-- Note: Only drop if you want to recreate. Comment out if you want to preserve existing data.
-- DROP TABLE IF EXISTS vendor_registration_requests CASCADE;

-- =====================================================
-- 1. VENDOR REGISTRATION REQUESTS TABLE
-- Stores vendor registration applications
-- =====================================================

CREATE TABLE IF NOT EXISTS vendor_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100), -- e.g., 'Retailer', 'Manufacturer', 'Wholesaler'
  gstin VARCHAR(15), -- GST Identification Number
  pan VARCHAR(10), -- PAN Number
  
  -- Contact Information
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  alternate_phone VARCHAR(20),
  
  -- Address Information
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  country VARCHAR(100) DEFAULT 'India',
  
  -- Business Documents (URLs to uploaded files)
  business_license_url TEXT,
  gst_certificate_url TEXT,
  pan_card_url TEXT,
  bank_account_proof_url TEXT,
  other_documents JSONB, -- Array of document URLs with labels
  
  -- Bank Details
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  ifsc_code VARCHAR(11),
  account_holder_name VARCHAR(255),
  
  -- Additional Information
  business_description TEXT,
  years_in_business INTEGER,
  website_url TEXT,
  social_media_links JSONB, -- JSON object with social media URLs
  
  -- Request Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'on_hold')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- User Account (created after approval)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. UPDATE VENDORS TABLE (if needed)
-- Ensure vendors table has necessary fields
-- =====================================================

-- Add columns to vendors table if they don't exist
DO $$ 
BEGIN
  -- Add user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE vendors ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add registration_request_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'registration_request_id'
  ) THEN
    ALTER TABLE vendors ADD COLUMN registration_request_id UUID REFERENCES vendor_registration_requests(id) ON DELETE SET NULL;
  END IF;
  
  -- Add business details if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'gstin'
  ) THEN
    ALTER TABLE vendors ADD COLUMN gstin VARCHAR(15);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'pan'
  ) THEN
    ALTER TABLE vendors ADD COLUMN pan VARCHAR(10);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'business_address'
  ) THEN
    ALTER TABLE vendors ADD COLUMN business_address TEXT;
  END IF;
END $$;

-- =====================================================
-- 3. UPDATE USERS TABLE
-- Ensure users table supports vendor role
-- =====================================================

-- Add vendor_id to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE users ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_vendor_registration_requests_status ON vendor_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_vendor_registration_requests_email ON vendor_registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_vendor_registration_requests_created_at ON vendor_registration_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_registration_requests_user_id ON vendor_registration_requests(user_id);

-- Check if vendor indexes exist before creating
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vendors_user_id'
  ) THEN
    CREATE INDEX idx_vendors_user_id ON vendors(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_vendor_id'
  ) THEN
    CREATE INDEX idx_users_vendor_id ON users(vendor_id);
  END IF;
END $$;

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendor_registration_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for vendor_registration_requests
CREATE TRIGGER trigger_update_vendor_registration_timestamp
BEFORE UPDATE ON vendor_registration_requests
FOR EACH ROW
EXECUTE FUNCTION update_vendor_registration_updated_at();

-- Function to approve vendor registration and create user account
CREATE OR REPLACE FUNCTION approve_vendor_registration(
  request_id UUID,
  admin_user_id UUID
) RETURNS UUID AS $$
DECLARE
  request_record RECORD;
  new_vendor_id UUID;
  new_user_id UUID;
  user_email TEXT;
  user_password TEXT;
BEGIN
  -- Get request details
  SELECT * INTO request_record 
  FROM vendor_registration_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration request not found or already processed';
  END IF;
  
  -- Generate temporary password (should be changed on first login)
  user_password := 'TempPass' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
  
  -- Create vendor record
  -- Note: Adjust column names based on your actual vendors table structure
  INSERT INTO vendors (
    business_name,
    contact_email,
    contact_phone,
    location,
    is_verified,
    gstin,
    pan,
    business_address,
    registration_request_id
  ) VALUES (
    request_record.business_name,
    request_record.email,
    request_record.phone,
    request_record.city || ', ' || request_record.state,
    true,
    request_record.gstin,
    request_record.pan,
    request_record.address_line1 || COALESCE(', ' || request_record.address_line2, ''),
    request_id
  ) RETURNING id INTO new_vendor_id;
  
  -- Note: User account creation should be done via API route with proper auth
  -- This function just updates the request status
  
  -- Update request status
  UPDATE vendor_registration_requests
  SET 
    status = 'approved',
    reviewed_by = admin_user_id,
    reviewed_at = NOW(),
    vendor_id = new_vendor_id
  WHERE id = request_id;
  
  RETURN new_vendor_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Pending Registration Requests
CREATE OR REPLACE VIEW pending_vendor_registrations AS
SELECT 
  id,
  business_name,
  contact_name,
  email,
  phone,
  city,
  state,
  status,
  created_at,
  EXTRACT(DAY FROM NOW() - created_at) as days_pending
FROM vendor_registration_requests
WHERE status = 'pending'
ORDER BY created_at ASC;

-- View: Approved Vendors with User Accounts
-- Note: Uses only columns that are guaranteed to exist
CREATE OR REPLACE VIEW approved_vendors_with_users AS
SELECT 
  v.id as vendor_id,
  COALESCE(v.business_name, vrr.business_name) as name,
  vrr.email as email,
  COALESCE(v.is_verified, false) as is_active,
  v.gstin,
  u.id as user_id,
  u.role,
  vrr.business_name,
  vrr.created_at as registration_date
FROM vendors v
LEFT JOIN users u ON v.user_id = u.id
LEFT JOIN vendor_registration_requests vrr ON v.registration_request_id = vrr.id
WHERE vrr.status = 'approved' OR v.user_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE vendor_registration_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert registration requests (public form)
CREATE POLICY "Anyone can insert registration requests" 
ON vendor_registration_requests 
FOR INSERT 
WITH CHECK (true);

-- Policy: Users can view their own registration requests
CREATE POLICY "Users can view own registration requests" 
ON vendor_registration_requests 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy: Admins can view all registration requests
CREATE POLICY "Admins can manage registration requests" 
ON vendor_registration_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE vendor_registration_requests IS 'Stores vendor registration applications and approval workflow';
COMMENT ON COLUMN vendor_registration_requests.status IS 'Request status: pending, under_review, approved, rejected, on_hold';
COMMENT ON COLUMN vendor_registration_requests.user_id IS 'User account created after approval';
COMMENT ON COLUMN vendor_registration_requests.vendor_id IS 'Vendor record created after approval';

-- =====================================================
-- END OF SCHEMA
-- =====================================================

