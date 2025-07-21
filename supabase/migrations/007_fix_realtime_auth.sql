-- Fix realtime authentication issues
-- This migration updates the RLS policies to work with custom JWT authentication

-- Drop existing function
DROP FUNCTION IF EXISTS get_wallet_address();

-- Create updated function to work with custom JWT authentication
CREATE OR REPLACE FUNCTION get_wallet_address()
RETURNS TEXT AS $$
BEGIN
    -- Extract wallet address from JWT claims
    -- This now works with our custom authentication system
    RETURN COALESCE(
        (auth.jwt() ->> 'wallet_address'),
        (auth.jwt() -> 'user_metadata' ->> 'wallet_address'),
        (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address'),
        -- Fallback to sub claim for our custom tokens
        (auth.jwt() ->> 'sub')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing verify_nft_ownership function
DROP FUNCTION IF EXISTS verify_nft_ownership(TEXT, TEXT);

-- Create updated function with proper security
CREATE OR REPLACE FUNCTION verify_nft_ownership(wallet_addr TEXT, nft_mint TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- This is a placeholder function that should be replaced with actual Solana NFT verification
    -- For now, we'll assume verification is handled client-side and stored in chat_participants
    RETURN EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE wallet_address = wallet_addr 
        AND nft_mint_address = nft_mint 
        AND nft_ownership_verified = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add a simplified policy for realtime subscriptions
-- This allows authenticated users to read data they have access to
CREATE POLICY "Enable realtime for chats"
ON public.chats FOR SELECT
TO authenticated
USING (
    -- Allow if user is authenticated and is a participant
    sender_wallet = get_wallet_address() OR 
    recipient_wallet = get_wallet_address()
);

CREATE POLICY "Enable realtime for messages"
ON public.messages FOR SELECT
TO authenticated
USING (
    -- Allow if user is authenticated and has access to the chat
    EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = messages.chat_id
        AND (
            c.sender_wallet = get_wallet_address() OR 
            c.recipient_wallet = get_wallet_address()
        )
    )
);

-- Update the chat timestamp function with proper security
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

-- Add comments
COMMENT ON FUNCTION get_wallet_address() IS 'Extracts wallet address from JWT authentication token - updated for custom auth';
COMMENT ON FUNCTION verify_nft_ownership(TEXT, TEXT) IS 'Verifies if a wallet owns a specific NFT - updated for security';
COMMENT ON FUNCTION update_chat_timestamp() IS 'Updates chat timestamp when messages change - updated for security';