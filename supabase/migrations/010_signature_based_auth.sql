-- Update authentication system to use signature-based wallet authentication
-- This migration removes dependency on Supabase Auth and uses custom wallet authentication

-- Drop the existing get_wallet_address function that depends on Supabase Auth
DROP FUNCTION IF EXISTS get_wallet_address();

-- Create new function to get wallet address from request headers
CREATE OR REPLACE FUNCTION get_wallet_address()
RETURNS TEXT AS $$
BEGIN
    -- Get wallet address from X-Wallet-Address header set by authenticated clients
    RETURN current_setting('request.headers', true)::json->>'x-wallet-address';
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback: try to get from user metadata if still using Supabase Auth
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

-- Update all policies to work with both authenticated and public access
-- The authentication will be verified at the application layer

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read chats where they are participants" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats with their wallet as sender" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can read messages from accessible chats" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages with their wallet as sender" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read participants from accessible chats" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can create participant records for themselves" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can update their own participant records" ON public.chat_participants;
DROP POLICY IF EXISTS "Anonymous users can read public chats" ON public.chats;
DROP POLICY IF EXISTS "Anonymous users can read public messages" ON public.messages;

-- Create new policies that work with header-based authentication
-- These policies apply to both authenticated and public access

-- Chats policies
CREATE POLICY "Wallet-based chat access"
ON public.chats FOR SELECT
USING (
    get_wallet_address() IS NOT NULL AND (
        sender_wallet = get_wallet_address() OR 
        recipient_wallet = get_wallet_address()
    )
);

CREATE POLICY "Wallet-based chat creation"
ON public.chats FOR INSERT
WITH CHECK (
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
);

CREATE POLICY "Wallet-based chat updates"
ON public.chats FOR UPDATE
USING (
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
)
WITH CHECK (
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
);

-- Messages policies
CREATE POLICY "Wallet-based message access"
ON public.messages FOR SELECT
USING (
    get_wallet_address() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = messages.chat_id
        AND (
            c.sender_wallet = get_wallet_address() OR 
            c.recipient_wallet = get_wallet_address()
        )
    )
);

CREATE POLICY "Wallet-based message creation"
ON public.messages FOR INSERT
WITH CHECK (
    get_wallet_address() IS NOT NULL AND
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

CREATE POLICY "Wallet-based message updates"
ON public.messages FOR UPDATE
USING (
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
)
WITH CHECK (
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
);

-- Chat participants policies
CREATE POLICY "Wallet-based participant access"
ON public.chat_participants FOR SELECT
USING (
    get_wallet_address() IS NOT NULL AND (
        wallet_address = get_wallet_address() OR
        EXISTS (
            SELECT 1 FROM public.chats c
            WHERE c.id = chat_participants.chat_id
            AND (
                c.sender_wallet = get_wallet_address() OR 
                c.recipient_wallet = get_wallet_address()
            )
        )
    )
);

CREATE POLICY "Wallet-based participant creation"
ON public.chat_participants FOR INSERT
WITH CHECK (
    get_wallet_address() IS NOT NULL AND
    wallet_address = get_wallet_address()
);

CREATE POLICY "Wallet-based participant updates"
ON public.chat_participants FOR UPDATE
USING (
    get_wallet_address() IS NOT NULL AND
    wallet_address = get_wallet_address()
)
WITH CHECK (
    get_wallet_address() IS NOT NULL AND
    wallet_address = get_wallet_address()
);

-- Add a helper function to validate if a wallet address format is valid
CREATE OR REPLACE FUNCTION is_valid_solana_address(address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic validation for Solana address format
    -- Solana addresses are base58 encoded and typically 32-50 characters
    RETURN address IS NOT NULL 
        AND length(address) >= 32 
        AND length(address) <= 50
        AND address ~ '^[1-9A-HJ-NP-Za-km-z]+$'; -- Base58 character set
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint to ensure valid wallet addresses
ALTER TABLE public.chats 
    ADD CONSTRAINT valid_sender_wallet 
    CHECK (is_valid_solana_address(sender_wallet));

ALTER TABLE public.chats 
    ADD CONSTRAINT valid_recipient_wallet 
    CHECK (is_valid_solana_address(recipient_wallet));

ALTER TABLE public.messages 
    ADD CONSTRAINT valid_sender_wallet 
    CHECK (is_valid_solana_address(sender_wallet));

ALTER TABLE public.chat_participants 
    ADD CONSTRAINT valid_wallet_address 
    CHECK (is_valid_solana_address(wallet_address));

-- Update comments
COMMENT ON FUNCTION get_wallet_address() IS 'Extracts wallet address from X-Wallet-Address header or auth metadata';
COMMENT ON FUNCTION is_valid_solana_address(TEXT) IS 'Validates Solana wallet address format';

-- Ensure RLS is enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;