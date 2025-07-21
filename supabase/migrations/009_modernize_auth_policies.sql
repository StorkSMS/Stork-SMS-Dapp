-- Modernize authentication policies for Supabase Auth compatibility
-- This migration simplifies the overly complex custom JWT policies to work with standard Supabase Auth

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Secure: Users can only read their own chats" ON public.chats;
DROP POLICY IF EXISTS "Secure: Users can only create chats with their wallet" ON public.chats;
DROP POLICY IF EXISTS "Secure: Users can only update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Secure: Users can only read messages from their chats" ON public.messages;
DROP POLICY IF EXISTS "Secure: Users can only create messages with their wallet" ON public.messages;
DROP POLICY IF EXISTS "Secure: Users can only update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Secure: Users can only read participants from their chats" ON public.chat_participants;
DROP POLICY IF EXISTS "Secure: Users can only create participant records for themselves" ON public.chat_participants;
DROP POLICY IF EXISTS "Secure: Users can only update their own participant records" ON public.chat_participants;

-- Drop the overly complex custom functions
DROP FUNCTION IF EXISTS verify_jwt_signature();
DROP FUNCTION IF EXISTS get_wallet_address();

-- Create a simple function to get wallet address from user metadata
CREATE OR REPLACE FUNCTION get_wallet_address()
RETURNS TEXT AS $$
BEGIN
    -- Get wallet address from auth.users metadata
    RETURN (
        SELECT COALESCE(
            raw_user_meta_data->>'wallet_address',
            user_metadata->>'wallet_address'
        )
        FROM auth.users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Simple RLS policies using standard Supabase Auth

-- Chats policies
CREATE POLICY "Users can read chats where they are participants"
ON public.chats FOR SELECT
TO authenticated
USING (
    sender_wallet = get_wallet_address() OR 
    recipient_wallet = get_wallet_address()
);

CREATE POLICY "Users can create chats with their wallet as sender"
ON public.chats FOR INSERT
TO authenticated
WITH CHECK (
    sender_wallet = get_wallet_address()
);

CREATE POLICY "Users can update their own chats"
ON public.chats FOR UPDATE
TO authenticated
USING (
    sender_wallet = get_wallet_address()
)
WITH CHECK (
    sender_wallet = get_wallet_address()
);

-- Messages policies
CREATE POLICY "Users can read messages from accessible chats"
ON public.messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = messages.chat_id
        AND (
            c.sender_wallet = get_wallet_address() OR 
            c.recipient_wallet = get_wallet_address()
        )
    )
);

CREATE POLICY "Users can create messages with their wallet as sender"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_wallet = get_wallet_address()
    AND EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = messages.chat_id
        AND (
            c.sender_wallet = get_wallet_address() OR 
            c.recipient_wallet = get_wallet_address()
        )
    )
);

CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
    sender_wallet = get_wallet_address()
)
WITH CHECK (
    sender_wallet = get_wallet_address()
);

-- Chat participants policies
CREATE POLICY "Users can read participants from accessible chats"
ON public.chat_participants FOR SELECT
TO authenticated
USING (
    wallet_address = get_wallet_address() OR
    EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = chat_participants.chat_id
        AND (
            c.sender_wallet = get_wallet_address() OR 
            c.recipient_wallet = get_wallet_address()
        )
    )
);

CREATE POLICY "Users can create participant records for themselves"
ON public.chat_participants FOR INSERT
TO authenticated
WITH CHECK (
    wallet_address = get_wallet_address()
);

CREATE POLICY "Users can update their own participant records"
ON public.chat_participants FOR UPDATE
TO authenticated
USING (
    wallet_address = get_wallet_address()
)
WITH CHECK (
    wallet_address = get_wallet_address()
);

-- Anonymous access for basic operations (using publishable key)
CREATE POLICY "Anonymous users can read public chats"
ON public.chats FOR SELECT
TO anon
USING (false); -- Disabled for now, enable if needed

CREATE POLICY "Anonymous users can read public messages"
ON public.messages FOR SELECT
TO anon
USING (false); -- Disabled for now, enable if needed

-- Update the chat timestamp function to be simpler
DROP FUNCTION IF EXISTS update_chat_timestamp();
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chats 
    SET updated_at = NOW() 
    WHERE id = COALESCE(NEW.chat_id, OLD.chat_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS messages_update_chat_timestamp ON public.messages;
CREATE TRIGGER messages_update_chat_timestamp
    AFTER INSERT OR UPDATE OR DELETE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_timestamp();

-- Add comments for documentation
COMMENT ON FUNCTION get_wallet_address() IS 'Extracts wallet address from Supabase Auth user metadata';
COMMENT ON FUNCTION update_chat_timestamp() IS 'Updates chat timestamp when messages change';

-- Clean up old security audit system (if it exists)
DROP TABLE IF EXISTS public.security_audit_log CASCADE;
DROP FUNCTION IF EXISTS log_security_event(text, text, boolean, text, jsonb);

-- Verify RLS is enabled on all tables
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;