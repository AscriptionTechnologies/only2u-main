-- Migration: Create App Feedbacks Table
-- Description: Stores user feedback with status for admin approval/rejection
-- Author: Antigravity

CREATE TABLE IF NOT EXISTS app_feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  feedback_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_app_feedbacks_status ON app_feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_app_feedbacks_created_at ON app_feedbacks(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_app_feedbacks_updated_at
  BEFORE UPDATE ON app_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE app_feedbacks IS 'General application feedback from users';
