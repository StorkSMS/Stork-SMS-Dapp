-- Create chat_participants table for managing access rights
-- This table tracks wallet addresses with access rights based on NFT ownership

CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    nft_mint_address TEXT NOT NULL,
    role TEXT DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'admin')),
    nft_ownership_verified BOOLEAN DEFAULT FALSE,
    nft_verification_timestamp TIMESTAMP WITH TIME ZONE,
    last_read_message_id UUID REFERENCES public.messages(id),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure unique participant per chat
    CONSTRAINT unique_chat_participant UNIQUE(chat_id, wallet_address)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_participants_wallet ON public.chat_participants(wallet_address);
CREATE INDEX IF NOT EXISTS idx_participants_nft_mint ON public.chat_participants(nft_mint_address);
CREATE INDEX IF NOT EXISTS idx_participants_verified ON public.chat_participants(nft_ownership_verified) WHERE nft_ownership_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_participants_active ON public.chat_participants(is_active) WHERE is_active = TRUE;

-- Add trigger to update last_activity
CREATE OR REPLACE FUNCTION update_participant_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_participants_activity 
    BEFORE UPDATE ON public.chat_participants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_participant_activity();

-- Add comments for documentation
COMMENT ON TABLE public.chat_participants IS 'Manages wallet addresses with NFT-based access rights to chats';
COMMENT ON COLUMN public.chat_participants.nft_ownership_verified IS 'Whether NFT ownership has been verified for this participant';
COMMENT ON COLUMN public.chat_participants.last_read_message_id IS 'Last message read by this participant for unread count calculation';