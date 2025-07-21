-- Fix authentication mismatch between JWT tokens and header-based RLS policies
-- This migration ensures the get_wallet_address() function works properly with both
-- Supabase Auth JWT tokens and fallback header-based authentication

-- Drop the existing get_wallet_address function
DROP FUNCTION IF EXISTS get_wallet_address();

-- Create improved function that properly reads from JWT claims first
CREATE OR REPLACE FUNCTION get_wallet_address()
RETURNS TEXT AS $$
DECLARE
    wallet_addr TEXT;
BEGIN
    -- First try to get from JWT claims (standard Supabase Auth)
    SELECT COALESCE(
        (auth.jwt() ->> 'wallet_address')::TEXT,
        (auth.jwt() -> 'user_metadata' ->> 'wallet_address')::TEXT,
        (auth.jwt() -> 'app_metadata' ->> 'wallet_address')::TEXT
    ) INTO wallet_addr;
    
    -- If we got a wallet address from JWT, return it
    IF wallet_addr IS NOT NULL AND wallet_addr != '' THEN
        RETURN wallet_addr;
    END IF;
    
    -- Fallback: try to get from auth.users table
    SELECT COALESCE(
        raw_user_meta_data->>'wallet_address',
        user_metadata->>'wallet_address'
    ) INTO wallet_addr
    FROM auth.users 
    WHERE id = auth.uid();
    
    -- If we got a wallet address from user metadata, return it
    IF wallet_addr IS NOT NULL AND wallet_addr != '' THEN
        RETURN wallet_addr;
    END IF;
    
    -- Last resort: try to get from X-Wallet-Address header
    BEGIN
        SELECT (current_setting('request.headers', true)::json->>'x-wallet-address')
        INTO wallet_addr;
        
        IF wallet_addr IS NOT NULL AND wallet_addr != '' THEN
            RETURN wallet_addr;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- If header reading fails, continue to return NULL
            NULL;
    END;
    
    -- Return NULL if no wallet address found
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add function to check if user is authenticated (either via JWT or header)
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if we have a valid JWT token
    IF auth.uid() IS NOT NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if we have a valid X-Wallet-Address header
    BEGIN
        IF current_setting('request.headers', true)::json->>'x-wallet-address' IS NOT NULL THEN
            RETURN TRUE;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN FALSE;
    END;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update policies to use the new authentication check
-- This ensures they work with both JWT tokens and header-based auth

-- Drop existing policies
DROP POLICY IF EXISTS "Wallet-based chat access" ON public.chats;
DROP POLICY IF EXISTS "Wallet-based chat creation" ON public.chats;
DROP POLICY IF EXISTS "Wallet-based chat updates" ON public.chats;
DROP POLICY IF EXISTS "Wallet-based message access" ON public.messages;
DROP POLICY IF EXISTS "Wallet-based message creation" ON public.messages;
DROP POLICY IF EXISTS "Wallet-based message updates" ON public.messages;
DROP POLICY IF EXISTS "Wallet-based participant access" ON public.chat_participants;
DROP POLICY IF EXISTS "Wallet-based participant creation" ON public.chat_participants;
DROP POLICY IF EXISTS "Wallet-based participant updates" ON public.chat_participants;

-- Create updated policies that work with both authentication methods

-- Chats policies
CREATE POLICY "Authenticated wallet chat access"
ON public.chats FOR SELECT
USING (
    is_authenticated() AND
    get_wallet_address() IS NOT NULL AND (
        sender_wallet = get_wallet_address() OR 
        recipient_wallet = get_wallet_address()
    )
);

CREATE POLICY "Authenticated wallet chat creation"
ON public.chats FOR INSERT
WITH CHECK (
    is_authenticated() AND
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
);

CREATE POLICY "Authenticated wallet chat updates"
ON public.chats FOR UPDATE
USING (
    is_authenticated() AND
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
)
WITH CHECK (
    is_authenticated() AND
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
);

-- Messages policies
CREATE POLICY "Authenticated wallet message access"
ON public.messages FOR SELECT
USING (
    is_authenticated() AND
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

CREATE POLICY "Authenticated wallet message creation"
ON public.messages FOR INSERT
WITH CHECK (
    is_authenticated() AND
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

CREATE POLICY "Authenticated wallet message updates"
ON public.messages FOR UPDATE
USING (
    is_authenticated() AND
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
)
WITH CHECK (
    is_authenticated() AND
    get_wallet_address() IS NOT NULL AND
    sender_wallet = get_wallet_address()
);

-- Chat participants policies
CREATE POLICY "Authenticated wallet participant access"
ON public.chat_participants FOR SELECT
USING (
    is_authenticated() AND
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

CREATE POLICY "Authenticated wallet participant creation"
ON public.chat_participants FOR INSERT
WITH CHECK (
    is_authenticated() AND
    get_wallet_address() IS NOT NULL AND
    wallet_address = get_wallet_address()
);

CREATE POLICY "Authenticated wallet participant updates"
ON public.chat_participants FOR UPDATE
USING (
    is_authenticated() AND
    get_wallet_address() IS NOT NULL AND
    wallet_address = get_wallet_address()
)
WITH CHECK (
    is_authenticated() AND
    get_wallet_address() IS NOT NULL AND
    wallet_address = get_wallet_address()
);

-- Update comments
COMMENT ON FUNCTION get_wallet_address() IS 'Extracts wallet address from JWT claims, auth metadata, or X-Wallet-Address header';
COMMENT ON FUNCTION is_authenticated() IS 'Checks if user is authenticated via JWT token or header-based auth';

-- Ensure RLS is enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;