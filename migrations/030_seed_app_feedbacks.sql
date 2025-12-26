-- Migration: Seed App Feedbacks
-- Description: Adds sample data for testing the Feedback Approval Screen

INSERT INTO app_feedbacks (feedback_text, status, created_at) VALUES
('The app crashes when I try to upload a large profile picture.', 'pending', NOW() - INTERVAL '2 hours'),
('Great collection of sarees! Would love to see more silk options.', 'approved', NOW() - INTERVAL '1 day'),
('Can you add a filter for price range in the search?', 'pending', NOW() - INTERVAL '5 hours'),
('My order #12345 hasn''t arrived yet. Please check.', 'rejected', NOW() - INTERVAL '3 days'),
('The dark mode looks amazing. Good job team!', 'approved', NOW() - INTERVAL '1 week'),
('UI acts weird on iPad Pro. Buttons are overlapping.', 'pending', NOW() - INTERVAL '30 minutes'),
('I found a typo on the About Us page.', 'pending', NOW() - INTERVAL '10 minutes');
