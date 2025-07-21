-- Create chats table for NFT-based messaging
-- This table stores chat metadata with NFT mint addresses and fee tracking

CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_nft_mint TEXT NOT NULL,
    recipient_nft_mint TEXT NOT NULL,
    sender_wallet TEXT NOT NULL,
    recipient_wallet TEXT NOT NULL,
    chat_title TEXT,
    fee_amount BIGINT NOT NULL DEFAULT 0,
    fee_transaction_signature TEXT,
    fee_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Create unique constraint to prevent duplicate chats
    CONSTRAINT unique_nft_chat UNIQUE(sender_nft_mint, recipient_nft_mint)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_sender_nft ON public.chats(sender_nft_mint);
CREATE INDEX IF NOT EXISTS idx_chats_recipient_nft ON public.chats(recipient_nft_mint);
CREATE INDEX IF NOT EXISTS idx_chats_sender_wallet ON public.chats(sender_wallet);
CREATE INDEX IF NOT EXISTS idx_chats_recipient_wallet ON public.chats(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_active ON public.chats(is_active) WHERE is_active = TRUE;

-- Add comments for documentation
COMMENT ON TABLE public.chats IS 'Stores chat metadata for NFT-based messaging with fee tracking';
COMMENT ON COLUMN public.chats.sender_nft_mint IS 'Mint address of the NFT owned by the message sender';
COMMENT ON COLUMN public.chats.recipient_nft_mint IS 'Mint address of the NFT owned by the message recipient';
COMMENT ON COLUMN public.chats.fee_amount IS 'Fee amount in lamports required to access this chat';
COMMENT ON COLUMN public.chats.fee_transaction_signature IS 'Solana transaction signature for fee payment verification';