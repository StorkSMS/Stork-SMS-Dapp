-- Seed data for development and testing
-- This file contains sample data for the NFT messaging system

-- Insert sample chats (for testing - using placeholder NFT mints)
INSERT INTO public.chats (
    id,
    sender_nft_mint,
    recipient_nft_mint,
    sender_wallet,
    recipient_wallet,
    chat_title,
    fee_amount,
    fee_paid
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    'AbCdEfGhIjKlMnOpQrStUvWxYz123456789',
    'ZyXwVuTsRqPoNmLkJiHgFeDcBa987654321',
    'ELY9hWRL9UeoFiip9eVU6y68vG12DZTwVPk9bmV3FcSw',
    'B1AfnKQbZ3sTKWAwEY9t4VT8EbX9Z4LqLt7nzN5QkZ1P',
    'Rare NFT Holders Chat',
    1000000,
    true
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'MnOpQrStUvWxYzAbCdEfGhIjKl123456789',
    'FeDcBaZyXwVuTsRqPoNmLkJiHg987654321',
    'B1AfnKQbZ3sTKWAwEY9t4VT8EbX9Z4LqLt7nzN5QkZ1P',
    'ELY9hWRL9UeoFiip9eVU6y68vG12DZTwVPk9bmV3FcSw',
    'Art Collectors Discussion',
    500000,
    false
) ON CONFLICT (sender_nft_mint, recipient_nft_mint) DO NOTHING;

-- Insert sample chat participants
INSERT INTO public.chat_participants (
    chat_id,
    wallet_address,
    nft_mint_address,
    role,
    nft_ownership_verified
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    'ELY9hWRL9UeoFiip9eVU6y68vG12DZTwVPk9bmV3FcSw',
    'AbCdEfGhIjKlMnOpQrStUvWxYz123456789',
    'owner',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    'B1AfnKQbZ3sTKWAwEY9t4VT8EbX9Z4LqLt7nzN5QkZ1P',
    'ZyXwVuTsRqPoNmLkJiHgFeDcBa987654321',
    'participant',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'B1AfnKQbZ3sTKWAwEY9t4VT8EbX9Z4LqLt7nzN5QkZ1P',
    'MnOpQrStUvWxYzAbCdEfGhIjKl123456789',
    'owner',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'ELY9hWRL9UeoFiip9eVU6y68vG12DZTwVPk9bmV3FcSw',
    'FeDcBaZyXwVuTsRqPoNmLkJiHgFeDcBa987654321',
    'participant',
    true
) ON CONFLICT (chat_id, wallet_address) DO NOTHING;

-- Insert sample messages (encrypted placeholders)
INSERT INTO public.messages (
    chat_id,
    sender_wallet,
    encrypted_content,
    message_type
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440001',
    'ELY9hWRL9UeoFiip9eVU6y68vG12DZTwVPk9bmV3FcSw',
    'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=',
    'text'
),
(
    '550e8400-e29b-41d4-a716-446655440001',
    'B1AfnKQbZ3sTKWAwEY9t4VT8EbX9Z4LqLt7nzN5QkZ1P',
    'U2FsdGVkX1+3K2lB4H0Z+6rJKWvb8K1Y5XjFRIipRkw=',
    'text'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'B1AfnKQbZ3sTKWAwEY9t4VT8EbX9Z4LqLt7nzN5QkZ1P',
    'U2FsdGVkX1+rJKWvb8K1Y5XjFRIipRkw3K2lB4H0Z+6=',
    'text'
);

-- Update chat timestamps to reflect latest activity
UPDATE public.chats SET updated_at = NOW() WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002'
);