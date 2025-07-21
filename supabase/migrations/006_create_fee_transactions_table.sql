-- Create fee_transactions table for tracking NFT creation fees
CREATE TABLE fee_transactions (
    id text PRIMARY KEY,
    message_id text NOT NULL,
    sender_wallet text NOT NULL,
    fee_amount_sol decimal(18,9) NOT NULL,
    fee_amount_lamports bigint NOT NULL,
    transaction_signature text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    metadata jsonb DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT fee_transactions_fee_amount_positive CHECK (fee_amount_sol > 0),
    CONSTRAINT fee_transactions_lamports_positive CHECK (fee_amount_lamports > 0)
);

-- Create indexes for efficient querying
CREATE INDEX idx_fee_transactions_message_id ON fee_transactions(message_id);
CREATE INDEX idx_fee_transactions_sender_wallet ON fee_transactions(sender_wallet);
CREATE INDEX idx_fee_transactions_status ON fee_transactions(status);
CREATE INDEX idx_fee_transactions_created_at ON fee_transactions(created_at DESC);
CREATE INDEX idx_fee_transactions_transaction_signature ON fee_transactions(transaction_signature);

-- Create composite index for common queries
CREATE INDEX idx_fee_transactions_sender_status_date ON fee_transactions(sender_wallet, status, created_at DESC);

-- Add RLS (Row Level Security)
ALTER TABLE fee_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own fee transactions
CREATE POLICY "Users can view their own fee transactions" ON fee_transactions
    FOR SELECT
    USING (sender_wallet = current_setting('wallet.address', true));

-- Policy for service to insert fee transactions (authenticated via API)
CREATE POLICY "Service can insert fee transactions" ON fee_transactions
    FOR INSERT
    WITH CHECK (true);

-- Policy for service to update fee transactions (authenticated via API)
CREATE POLICY "Service can update fee transactions" ON fee_transactions
    FOR UPDATE
    USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fee_transactions_updated_at 
    BEFORE UPDATE ON fee_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE fee_transactions IS 'Tracks fee payments for NFT message creation';
COMMENT ON COLUMN fee_transactions.id IS 'Unique identifier for the fee transaction';
COMMENT ON COLUMN fee_transactions.message_id IS 'ID of the message this fee is for';
COMMENT ON COLUMN fee_transactions.sender_wallet IS 'Wallet address of the user paying the fee';
COMMENT ON COLUMN fee_transactions.fee_amount_sol IS 'Fee amount in SOL';
COMMENT ON COLUMN fee_transactions.fee_amount_lamports IS 'Fee amount in lamports';
COMMENT ON COLUMN fee_transactions.transaction_signature IS 'Solana transaction signature';
COMMENT ON COLUMN fee_transactions.status IS 'Status of the fee transaction';
COMMENT ON COLUMN fee_transactions.metadata IS 'Additional metadata about the fee transaction';