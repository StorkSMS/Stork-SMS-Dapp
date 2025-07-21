-- Enable real-time subscriptions for live messaging
-- This allows clients to receive live updates for messages and chat changes

-- Enable real-time for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable real-time for chats table (for status updates, new chats)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Enable real-time for chat_participants table (for participant changes)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;

-- Create a view for real-time message updates with chat context
CREATE OR REPLACE VIEW public.live_messages AS
SELECT 
    m.id,
    m.chat_id,
    m.sender_wallet,
    m.encrypted_content,
    m.message_type,
    m.file_url,
    m.file_name,
    m.created_at,
    c.sender_nft_mint,
    c.recipient_nft_mint,
    c.chat_title
FROM public.messages m
JOIN public.chats c ON m.chat_id = c.id
WHERE m.is_deleted = FALSE
AND c.is_active = TRUE;

-- Enable RLS on the view
ALTER VIEW public.live_messages SET (security_invoker = true);

-- Create a view for chat summaries with last message
CREATE OR REPLACE VIEW public.chat_summaries AS
SELECT 
    c.id,
    c.sender_nft_mint,
    c.recipient_nft_mint,
    c.sender_wallet,
    c.recipient_wallet,
    c.chat_title,
    c.fee_paid,
    c.created_at,
    c.updated_at,
    COALESCE(last_msg.encrypted_content, '') as last_message_content,
    COALESCE(last_msg.created_at, c.created_at) as last_message_at,
    COALESCE(last_msg.sender_wallet, '') as last_message_sender,
    (
        SELECT COUNT(*) 
        FROM public.messages m 
        WHERE m.chat_id = c.id 
        AND m.is_deleted = FALSE
    ) as message_count
FROM public.chats c
LEFT JOIN LATERAL (
    SELECT m.encrypted_content, m.created_at, m.sender_wallet
    FROM public.messages m
    WHERE m.chat_id = c.id 
    AND m.is_deleted = FALSE
    ORDER BY m.created_at DESC
    LIMIT 1
) last_msg ON true
WHERE c.is_active = TRUE;

-- Enable RLS on the view
ALTER VIEW public.chat_summaries SET (security_invoker = true);

-- Create function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_count(p_chat_id UUID, p_wallet_address TEXT)
RETURNS INTEGER AS $$
DECLARE
    last_read_id UUID;
    unread_count INTEGER;
BEGIN
    -- Get the last read message ID for this user
    SELECT last_read_message_id INTO last_read_id
    FROM public.chat_participants
    WHERE chat_id = p_chat_id 
    AND wallet_address = p_wallet_address;
    
    -- Count messages after the last read message
    IF last_read_id IS NULL THEN
        SELECT COUNT(*) INTO unread_count
        FROM public.messages
        WHERE chat_id = p_chat_id 
        AND is_deleted = FALSE
        AND sender_wallet != p_wallet_address;
    ELSE
        SELECT COUNT(*) INTO unread_count
        FROM public.messages
        WHERE chat_id = p_chat_id 
        AND is_deleted = FALSE
        AND sender_wallet != p_wallet_address
        AND created_at > (
            SELECT created_at 
            FROM public.messages 
            WHERE id = last_read_id
        );
    END IF;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_chat_id UUID, p_message_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.chat_participants
    SET 
        last_read_message_id = p_message_id,
        last_activity = NOW()
    WHERE chat_id = p_chat_id 
    AND wallet_address = get_wallet_address();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON VIEW public.live_messages IS 'Real-time view of messages with chat context for live updates';
COMMENT ON VIEW public.chat_summaries IS 'Summary view of chats with last message and statistics';
COMMENT ON FUNCTION get_unread_count IS 'Returns count of unread messages for a user in a specific chat';
COMMENT ON FUNCTION mark_messages_read IS 'Marks messages as read up to a specific message ID';