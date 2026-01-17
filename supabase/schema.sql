-- TaskFlow Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_type AS ENUM ('client', 'internal');

-- ============================================
-- TABLES
-- ============================================

-- Organizations (Agencies)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Team Members)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role user_role DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plans (Subscription tiers for clients)
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER DEFAULT 0,
  billing_period TEXT DEFAULT 'month',
  task_limit INTEGER DEFAULT 5,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"can_create_tasks": true, "can_change_status": true, "can_manage_plans": true, "can_pause_subscription": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (Customer organizations)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  stripe_customer_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Client Users (Portal access for clients)
CREATE TABLE client_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

-- Workflow Statuses
CREATE TABLE statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT DEFAULT 'circle',
  color TEXT DEFAULT '#71717a',
  "group" TEXT DEFAULT 'in-progress', -- beginning, in-progress, end, specific
  is_default BOOLEAN DEFAULT false,
  in_task_limit BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  status_id UUID REFERENCES statuses(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'medium',
  type task_type DEFAULT 'client',
  service TEXT,
  due_date DATE,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Attachments
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#71717a',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Task Tags (junction table)
CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_tasks_organization ON tasks(organization_id);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_clients_organization ON clients(organization_id);
CREATE INDEX idx_clients_plan ON clients(plan_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Users can read their own organization's data
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view organization members" ON users
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view organization plans" ON plans
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage plans" ON plans
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view organization clients" ON clients
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage organization clients" ON clients
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view organization statuses" ON statuses
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage statuses" ON statuses
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view organization tasks" ON tasks
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update organization tasks" ON tasks
  FOR UPDATE USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view task comments" ON comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view attachments" ON attachments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload attachments" ON attachments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Client portal policies
CREATE POLICY "Client users can view their tasks" ON tasks
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM client_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Client users can view public comments" ON comments
  FOR SELECT USING (
    is_internal = false AND
    task_id IN (
      SELECT id FROM tasks WHERE client_id IN (
        SELECT client_id FROM client_users WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DEFAULT STATUSES (run after creating org)
-- ============================================

-- This function creates default statuses for a new organization
CREATE OR REPLACE FUNCTION create_default_statuses(org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO statuses (organization_id, name, slug, icon, "group", is_default, in_task_limit, position) VALUES
    (org_id, 'Not started', 'not-started', 'circle', 'beginning', true, false, 0),
    (org_id, 'To do', 'todo', 'clock', 'in-progress', true, false, 1),
    (org_id, 'In Progress', 'in-progress', 'loader', 'in-progress', false, true, 2),
    (org_id, 'Internal Review', 'internal-review', 'eye', 'in-progress', false, true, 3),
    (org_id, 'Awaiting feedback', 'awaiting-feedback', 'help-circle', 'in-progress', false, true, 4),
    (org_id, 'Done', 'done', 'check-circle-2', 'end', true, false, 5),
    (org_id, 'Blocked', 'blocked', 'ban', 'specific', false, false, 6);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Run this in Supabase Dashboard > Storage
-- Create a bucket called 'attachments' with these settings:
-- - Public: false
-- - File size limit: 50MB
-- - Allowed MIME types: (leave empty for all)
