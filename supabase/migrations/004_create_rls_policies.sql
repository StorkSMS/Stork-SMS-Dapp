-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Create function to verify NFT ownership (placeholder - will need to integrate with Solana RPC)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's wallet address from JWT claims
CREATE OR REPLACE FUNCTION get_wallet_address()
RETURNS TEXT AS $$
BEGIN
    -- Extract wallet address from JWT auth.raw_user_meta_data
    RETURN COALESCE(
        (auth.jwt() ->> 'wallet_address'),
        (auth.jwt() -> 'raw_user_meta_data' ->> 'wallet_address'),
        (auth.jwt() -> 'user_metadata' ->> 'wallet_address')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for chats table
-- Users can read chats where they own either NFT
CREATE POLICY "Users can read chats where they own NFTs"
ON public.chats FOR SELECT
TO authenticated
USING (
    sender_wallet = get_wallet_address() OR 
    recipient_wallet = get_wallet_address() OR
    EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.chat_id = chats.id 
        AND cp.wallet_address = get_wallet_address()
        AND cp.nft_ownership_verified = TRUE
        AND cp.is_active = TRUE
    )
);

-- Users can create chats if they own the sender NFT
CREATE POLICY "Users can create chats with their NFTs"
ON public.chats FOR INSERT
TO authenticated
WITH CHECK (
    sender_wallet = get_wallet_address()
);

-- Users can update chats where they are the sender
CREATE POLICY "Users can update their chats"
ON public.chats FOR UPDATE
TO authenticated
USING (sender_wallet = get_wallet_address())
WITH CHECK (sender_wallet = get_wallet_address());

-- RLS Policies for messages table
-- Users can read messages from chats they have access to
CREATE POLICY "Users can read messages from accessible chats"
ON public.messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = messages.chat_id
        AND (
            c.sender_wallet = get_wallet_address() OR 
            c.recipient_wallet = get_wallet_address() OR
            EXISTS (
                SELECT 1 FROM public.chat_participants cp
                WHERE cp.chat_id = c.id 
                AND cp.wallet_address = get_wallet_address()
                AND cp.nft_ownership_verified = TRUE
                AND cp.is_active = TRUE
            )
        )
    )
);

-- Users can create messages in chats they have access to
CREATE POLICY "Users can create messages in accessible chats"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_wallet = get_wallet_address() AND
    EXISTS (
        SELECT 1 FROM public.chats c
        WHERE c.id = messages.chat_id
        AND (
            c.sender_wallet = get_wallet_address() OR 
            c.recipient_wallet = get_wallet_address() OR
            EXISTS (
                SELECT 1 FROM public.chat_participants cp
                WHERE cp.chat_id = c.id 
                AND cp.wallet_address = get_wallet_address()
                AND cp.nft_ownership_verified = TRUE
                AND cp.is_active = TRUE
            )
        )
    )
);

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
TO authenticated
USING (sender_wallet = get_wallet_address())
WITH CHECK (sender_wallet = get_wallet_address());

-- RLS Policies for chat_participants table
-- Users can read participants of chats they have access to
CREATE POLICY "Users can read participants of accessible chats"
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

-- Users can create participant records for themselves
CREATE POLICY "Users can create participant records for themselves"
ON public.chat_participants FOR INSERT
TO authenticated
WITH CHECK (wallet_address = get_wallet_address());

-- Users can update their own participant records
CREATE POLICY "Users can update their own participant records"
ON public.chat_participants FOR UPDATE
TO authenticated
USING (wallet_address = get_wallet_address())
WITH CHECK (wallet_address = get_wallet_address());

-- Create additional trigger to update chats.updated_at when related data changes
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chats 
    SET updated_at = NOW() 
    WHERE id = COALESCE(NEW.chat_id, OLD.chat_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_on_message_change
    AFTER INSERT OR UPDATE OR DELETE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_timestamp();

-- Add comments
COMMENT ON FUNCTION verify_nft_ownership IS 'Verifies if a wallet owns a specific NFT (placeholder for Solana integration)';
COMMENT ON FUNCTION get_wallet_address IS 'Extracts wallet address from JWT authentication token';