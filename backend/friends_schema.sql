-- Supabase Database Schema for Friends/Follow Feature
-- Run this in your Supabase SQL Editor

-- Create follows table for tracking follow relationships
CREATE TABLE IF NOT EXISTS public.follows (
    id SERIAL PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Prevent duplicate follows
    UNIQUE(follower_id, following_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id, is_active);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view follows where they are the follower or following
CREATE POLICY "Users can view their own follows" ON public.follows
    FOR SELECT
    USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Users can create follows
CREATE POLICY "Users can create follows" ON public.follows
    FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

-- Users can update their own follows (for unfollowing)
CREATE POLICY "Users can update their own follows" ON public.follows
    FOR UPDATE
    USING (auth.uid() = follower_id);

-- Update profiles table to include new fields (if not exists)
DO $$ 
BEGIN
    -- Add bio column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='bio') THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    END IF;
    
    -- Add school column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='school') THEN
        ALTER TABLE public.profiles ADD COLUMN school VARCHAR(200);
    END IF;
    
    -- Add year column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='year') THEN
        ALTER TABLE public.profiles ADD COLUMN year VARCHAR(50);
    END IF;
    
    -- Add course column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='profiles' AND column_name='course') THEN
        ALTER TABLE public.profiles ADD COLUMN course VARCHAR(200);
    END IF;
END $$;

