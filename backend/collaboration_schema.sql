-- SQL Schema for Collaboration Features
-- Run this in your Supabase SQL Editor to enable collaboration features

-- =============================================
-- 1. TASK ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL, -- user_id who assigned the task
  assigned_to TEXT NOT NULL, -- user_id who the task is assigned to
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'declined')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(task_id, assigned_to)
);

-- Indexes for task assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to ON task_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_by ON task_assignments(assigned_by);

-- =============================================
-- 2. SHARED ITEMS TABLE (for notes, quizzes, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS shared_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('notebook', 'note', 'reviewer', 'task')),
  item_id INTEGER NOT NULL, -- ID of the item being shared
  shared_by TEXT NOT NULL, -- user_id who shared the item
  shared_with TEXT NOT NULL, -- user_id who can access the item
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'comment')),
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  is_accepted BOOLEAN DEFAULT FALSE,
  UNIQUE(item_type, item_id, shared_with)
);

-- Indexes for shared items
CREATE INDEX IF NOT EXISTS idx_shared_items_item_type_id ON shared_items(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_shared_with ON shared_items(shared_with);
CREATE INDEX IF NOT EXISTS idx_shared_items_shared_by ON shared_items(shared_by);

-- =============================================
-- 3. TASK COLLABORATORS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS task_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  collaborator_id TEXT NOT NULL, -- user_id who can collaborate
  role TEXT DEFAULT 'contributor' CHECK (role IN ('owner', 'editor', 'contributor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  contribution_count INTEGER DEFAULT 0,
  UNIQUE(task_id, collaborator_id)
);

-- Indexes for task collaborators
CREATE INDEX IF NOT EXISTS idx_task_collaborators_task_id ON task_collaborators(task_id);
CREATE INDEX IF NOT EXISTS idx_task_collaborators_collaborator_id ON task_collaborators(collaborator_id);

-- =============================================
-- 4. COLLABORATION ACTIVITY LOG
-- =============================================
CREATE TABLE IF NOT EXISTS collaboration_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('task', 'note', 'notebook', 'reviewer')),
  item_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('assigned', 'shared', 'accepted', 'declined', 'edited', 'completed', 'commented')),
  description TEXT,
  metadata JSONB, -- Additional data about the activity
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for collaboration activities
CREATE INDEX IF NOT EXISTS idx_collab_activities_item ON collaboration_activities(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_collab_activities_user_id ON collaboration_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_activities_created_at ON collaboration_activities(created_at DESC);

-- Function to log collaboration activity
CREATE OR REPLACE FUNCTION log_collaboration_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be called to log activities
  -- Implementation depends on specific needs
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

