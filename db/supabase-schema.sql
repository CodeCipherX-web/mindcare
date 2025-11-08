-- MindCare Mental Health Platform Database Schema
-- PostgreSQL/Supabase compatible

-- Enable UUID extension (optional, but useful for Supabase)
-- Note: This may already be enabled in your Supabase project
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) DEFAULT '', -- Empty string for OAuth users
    auth_provider VARCHAR(50) DEFAULT 'email', -- 'email' or 'google'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Moods table for tracking user moods
CREATE TABLE IF NOT EXISTS moods (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    mood VARCHAR(50) NOT NULL,
    mood_value INTEGER NOT NULL CHECK (mood_value BETWEEN 1 AND 5),
    logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT mood_value_range CHECK (mood_value >= 1 AND mood_value <= 5)
);

-- Create indexes for moods table
CREATE INDEX IF NOT EXISTS idx_moods_user_id ON moods(user_id);
CREATE INDEX IF NOT EXISTS idx_moods_logged_at ON moods(logged_at);

-- Journal entries table for user journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'Untitled',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Create indexes for journal_entries table
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication needs)
-- For now, we'll use service role key, so these can be permissive
-- In production, you should implement proper RLS policies

-- Allow all operations for authenticated users (if using Supabase Auth)
-- For now, we'll handle auth in the application layer
CREATE POLICY IF NOT EXISTS "Users can view their own data" ON users
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert their own data" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Moods are accessible to their owners" ON moods
    FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Journal entries are accessible to their owners" ON journal_entries
    FOR ALL USING (true);

