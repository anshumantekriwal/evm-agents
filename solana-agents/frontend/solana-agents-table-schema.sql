-- Solana Agents Table Schema
-- This creates a comprehensive table for storing Solana agent details

-- Drop existing table if it exists (for clean setup)
DROP TABLE IF EXISTS solana_agents CASCADE;

-- Create solana_agents table with sequential integer ID starting from 0
CREATE TABLE solana_agents (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    prompt TEXT,
    bot_type TEXT NOT NULL CHECK (bot_type IN ('dca', 'range', 'custom', 'twitter')),
    config JSONB NOT NULL,
    aws_url TEXT,
    owner_address TEXT,
    agent_wallet TEXT, -- Will be populated later from logs/status
    status TEXT NOT NULL DEFAULT 'deploying' CHECK (status IN ('deploying', 'running', 'stopped', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deployed_at TIMESTAMPTZ
);

-- Reset the sequence to start from 0 (next insert will be ID 0)
ALTER SEQUENCE solana_agents_id_seq RESTART WITH 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_solana_agents_user_id ON solana_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_solana_agents_user_email ON solana_agents(user_email);
CREATE INDEX IF NOT EXISTS idx_solana_agents_bot_type ON solana_agents(bot_type);
CREATE INDEX IF NOT EXISTS idx_solana_agents_status ON solana_agents(status);
CREATE INDEX IF NOT EXISTS idx_solana_agents_created_at ON solana_agents(created_at);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for solana_agents table
DROP TRIGGER IF EXISTS update_solana_agents_updated_at ON solana_agents;
CREATE TRIGGER update_solana_agents_updated_at
    BEFORE UPDATE ON solana_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE solana_agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own solana agents" ON solana_agents;
DROP POLICY IF EXISTS "Users can insert their own solana agents" ON solana_agents;
DROP POLICY IF EXISTS "Users can update their own solana agents" ON solana_agents;
DROP POLICY IF EXISTS "Users can delete their own solana agents" ON solana_agents;

-- Solana agents policies
CREATE POLICY "Users can view their own solana agents" ON solana_agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own solana agents" ON solana_agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solana agents" ON solana_agents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own solana agents" ON solana_agents
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE solana_agents TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the setup
SELECT 'Solana agents table setup completed successfully!' as status;
