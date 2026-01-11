-- ========================================
-- ADD INTENT TRACKING TO CHAT MESSAGES
-- Migration: AddIntentToChatMessages1736524800000
-- Date: 2026-01-10
-- ========================================

-- Add intent column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS intent VARCHAR(255) NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_intent 
ON chat_messages(intent);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    character_maximum_length, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_messages' 
AND column_name = 'intent';

-- Success message
SELECT 'Intent column added successfully!' AS status;

-- ========================================
-- ROLLBACK SQL (If needed)
-- ========================================
-- DROP INDEX IF EXISTS idx_chat_messages_intent;
-- ALTER TABLE chat_messages DROP COLUMN IF EXISTS intent;
