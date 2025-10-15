-- Migration: Create Vendor Q&A System
-- Date: 2025-10-15
-- Description: Creates tables for vendor/customer Q&A system visible to super admin

-- Create questions table
CREATE TABLE IF NOT EXISTS vendor_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create answers table
CREATE TABLE IF NOT EXISTS vendor_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES vendor_questions(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendor_questions_product_id ON vendor_questions(product_id);
CREATE INDEX IF NOT EXISTS idx_vendor_questions_vendor_id ON vendor_questions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_questions_customer_id ON vendor_questions(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendor_questions_created_at ON vendor_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_questions_is_answered ON vendor_questions(is_answered);
CREATE INDEX IF NOT EXISTS idx_vendor_answers_question_id ON vendor_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_vendor_answers_vendor_id ON vendor_answers(vendor_id);

-- Add trigger to update updated_at timestamp for questions
CREATE OR REPLACE FUNCTION update_vendor_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_questions_timestamp
BEFORE UPDATE ON vendor_questions
FOR EACH ROW
EXECUTE FUNCTION update_vendor_questions_updated_at();

-- Add trigger to update updated_at timestamp for answers
CREATE OR REPLACE FUNCTION update_vendor_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_answers_timestamp
BEFORE UPDATE ON vendor_answers
FOR EACH ROW
EXECUTE FUNCTION update_vendor_answers_updated_at();

-- Trigger to mark question as answered when answer is added
CREATE OR REPLACE FUNCTION mark_question_as_answered()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vendor_questions
  SET is_answered = TRUE, updated_at = NOW()
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER answer_added_trigger
AFTER INSERT ON vendor_answers
FOR EACH ROW
EXECUTE FUNCTION mark_question_as_answered();

-- Trigger to check if question should be marked as unanswered when answer is deleted
CREATE OR REPLACE FUNCTION check_question_answered_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there are any remaining answers for this question
  IF NOT EXISTS (
    SELECT 1 FROM vendor_answers 
    WHERE question_id = OLD.question_id
  ) THEN
    UPDATE vendor_questions
    SET is_answered = FALSE, updated_at = NOW()
    WHERE id = OLD.question_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER answer_deleted_trigger
AFTER DELETE ON vendor_answers
FOR EACH ROW
EXECUTE FUNCTION check_question_answered_status();

-- Verify the migration
SELECT 'Vendor Q&A tables created successfully' AS status;

-- Show sample query structure
SELECT 
  'Example: Fetch questions with answers, customer, and vendor info' AS info;

