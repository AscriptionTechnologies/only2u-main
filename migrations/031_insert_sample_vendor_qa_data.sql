-- Migration: Insert Sample Vendor Q&A Data
-- Date: 2025-12-27
-- Description: Inserts sample questions and answers for testing the Vendor Q&A system

-- Insert sample questions
INSERT INTO vendor_questions (id, product_id, vendor_id, customer_id, question_text, is_answered, is_approved, is_visible)
VALUES 
  (
    uuid_generate_v4(),
    (SELECT id FROM products LIMIT 1),
    (SELECT id FROM users LIMIT 1),
    (SELECT id FROM users ORDER BY created_at DESC LIMIT 1),
    'Is this product available in size XL?',
    TRUE,
    TRUE,
    TRUE
  ),
  (
    uuid_generate_v4(),
    (SELECT id FROM products OFFSET 1 LIMIT 1),
    (SELECT id FROM users LIMIT 1),
    (SELECT id FROM users ORDER BY created_at DESC LIMIT 1),
    'Does the color fade after washing?',
    FALSE,
    TRUE,
    TRUE
  ),
  (
    uuid_generate_v4(),
    (SELECT id FROM products LIMIT 1),
    (SELECT id FROM users LIMIT 1),
    (SELECT id FROM users ORDER BY created_at DESC LIMIT 1),
    'Can I get a bulk discount for 50 items?',
    TRUE,
    TRUE,
    TRUE
  );

-- Insert sample answers for the first question
INSERT INTO vendor_answers (question_id, vendor_id, answer_text, is_approved, is_visible)
SELECT 
  id,
  vendor_id,
  'Yes, XL size is currently in stock and ready to ship.',
  TRUE,
  TRUE
FROM vendor_questions 
WHERE question_text = 'Is this product available in size XL?' LIMIT 1;

-- Insert sample answers for the third question
INSERT INTO vendor_answers (question_id, vendor_id, answer_text, is_approved, is_visible)
SELECT 
  id,
  vendor_id,
  'Please contact our sales team at sales@example.com for bulk orders.',
  TRUE,
  TRUE
FROM vendor_questions 
WHERE question_text = 'Can I get a bulk discount for 50 items?' LIMIT 1;
