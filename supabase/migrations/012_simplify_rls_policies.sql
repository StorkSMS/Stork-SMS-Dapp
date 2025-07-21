-- Simplify RLS policies to fix realtime authentication issues
-- The complex authentication logic was causing problems with realtime subscriptions

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated wallet chat access" ON public.chats;
DROP POLICY IF EXISTS "Authenticated wallet chat creation" ON public.chats;
DROP POLICY IF EXISTS "Authenticated wallet chat updates" ON public.chats;
DROP POLICY IF EXISTS "Authenticated wallet message access" ON public.messages;
DROP POLICY IF EXISTS "Authenticated wallet message creation" ON public.messages;
DROP POLICY IF EXISTS "Authenticated wallet message updates" ON public.messages;
DROP POLICY IF EXISTS "Authenticated wallet participant access" ON public.chat_participants;
DROP POLICY IF EXISTS "Authenticated wallet participant creation" ON public.chat_participants;
DROP POLICY IF EXISTS "Authenticated wallet participant updates" ON public.chat_participants;

-- Drop complex functions that cause issues with realtime
DROP FUNCTION IF EXISTS get_wallet_address();
DROP FUNCTION IF EXISTS is_authenticated();

-- Create simple function to get wallet address from header only
CREATE OR REPLACE FUNCTION get_wallet_from_header()
RETURNS TEXT AS $$
BEGIN
    -- Only try to get from X-Wallet-Address header
    BEGIN
        RETURN current_setting('request.headers', true)::json->>'x-wallet-address';
    EXCEPTION
        WHEN OTHERS THEN
            RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create simplified policies that only use header-based authentication
-- This avoids JWT complexity that doesn't work well with realtime

-- Chats policies - allow access if wallet matches sender or recipient
CREATE POLICY "Header wallet chat access"
ON public.chats FOR SELECT
USING (
    get_wallet_from_header() IS NOT NULL AND (
        sender_wallet = get_wallet_from_header() OR 
        recipient_wallet = get_wallet_from_header()
    )
);

CREATE POLICY "Header wallet chat creation"
ON public.chats FOR INSERT
WITH CHECK (
    get_wallet_from_header() IS NOT NULL AND
    sender_wallet = get_wallet_from_header()
);

CREATE POLICY "Header wallet chat updates"
ON public.chats FOR UPDATE
USING (
    get_wallet_from_header() IS NOT NULL AND
    sender_wallet = get_wallet_from_header()
)
WITH CHECK (
    get_wallet_from_header() IS NOT NULL AND
    sender_wallet = get_wallet_from_header()
);

-- Messages policies - allow access if wallet can access the chat
CREATE POLICY "Header wallet message access"
ON public.messages FOR SELECT
USING (
    get_wallet_from_header() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = messages.chat_id
        AND (
            c.sender_wallet = get_wallet_from_header() OR 
            c.recipient_wallet = get_wallet_from_header()
        )
    )
);

CREATE POLICY "Header wallet message creation"
ON public.messages FOR INSERT
WITH CHECK (
    get_wallet_from_header() IS NOT NULL AND
    sender_wallet = get_wallet_from_header()
    AND EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = messages.chat_id
        AND (
            c.sender_wallet = get_wallet_from_header() OR 
            c.recipient_wallet = get_wallet_from_header()
        )
    )
);

CREATE POLICY "Header wallet message updates"
ON public.messages FOR UPDATE
USING (
    get_wallet_from_header() IS NOT NULL AND
    sender_wallet = get_wallet_from_header()
)
WITH CHECK (
    get_wallet_from_header() IS NOT NULL AND
    sender_wallet = get_wallet_from_header()
);

-- Chat participants policies - allow access if wallet matches
CREATE POLICY "Header wallet participant access"
ON public.chat_participants FOR SELECT
USING (
    get_wallet_from_header() IS NOT NULL AND (
        wallet_address = get_wallet_from_header() OR
        EXISTS (
            SELECT 1 FROM public.chats c
            WHERE c.id = chat_participants.chat_id
            AND (
                c.sender_wallet = get_wallet_from_header() OR 
                c.recipient_wallet = get_wallet_from_header()
            )
        )
    )
);

CREATE POLICY "Header wallet participant creation"
ON public.chat_participants FOR INSERT
WITH CHECK (
    get_wallet_from_header() IS NOT NULL AND
    wallet_address = get_wallet_from_header()
);

CREATE POLICY "Header wallet participant updates"
ON public.chat_participants FOR UPDATE
USING (
    get_wallet_from_header() IS NOT NULL AND
    wallet_address = get_wallet_from_header()
)
WITH CHECK (
    get_wallet_from_header() IS NOT NULL AND
    wallet_address = get_wallet_from_header()
);

-- Add comment
COMMENT ON FUNCTION get_wallet_from_header() IS 'Simple function to get wallet address from X-Wallet-Address header only';

-- Ensure RLS is enabled
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;