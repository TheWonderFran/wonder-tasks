import { SupabaseClient } from '@supabase/supabase-js'
import type { Task, Client, Status, Plan, Organization, User } from '../types'

// ============================================
// ORGANIZATION
// ============================================

export async function getOrCreateOrganization(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<Organization | null> {
  // First check if user already has an organization
  const { data: existingUser } = await supabase
    .from('users')
    .select('organization_id, organizations(*)')
    .eq('id', userId)
    .single()

  if (existingUser?.organization_id && existingUser.organizations) {
    return existingUser.organizations as Organization
  }

  // Create new organization for new users
  const orgName = userEmail.split('@')[0] + "'s Agency"
  const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')

  const { data: newOrg, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName, slug: orgSlug })
    .select()
    .single()

  if (orgError || !newOrg) {
    console.error('Error creating organization:', orgError)
    return null
  }

  // Create default statuses for the new organization
  await createDefaultStatuses(supabase, newOrg.id)

  // Update user with organization
  await supabase
    .from('users')
    .upsert({
      id: userId,
      email: userEmail,
      organization_id: newOrg.id,
      role: 'owner'
    })

  return newOrg as Organization
}

// ============================================
// STATUSES
// ============================================

export async function createDefaultStatuses(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  const defaultStatuses = [
    { name: 'Not started', slug: 'not-started', icon: 'circle', group: 'beginning', is_default: true, in_task_limit: false, position: 0 },
    { name: 'To do', slug: 'todo', icon: 'clock', group: 'in-progress', is_default: true, in_task_limit: false, position: 1 },
    { name: 'In Progress', slug: 'in-progress', icon: 'loader', group: 'in-progress', is_default: false, in_task_limit: true, position: 2 },
    { name: 'Internal Review', slug: 'internal-review', icon: 'eye', group: 'in-progress', is_default: false, in_task_limit: true, position: 3 },
    { name: 'Awaiting feedback', slug: 'awaiting-feedback', icon: 'help-circle', group: 'in-progress', is_default: false, in_task_limit: true, position: 4 },
    { name: 'Done', slug: 'done', icon: 'check-circle-2', group: 'end', is_default: true, in_task_limit: false, position: 5 },
    { name: 'Blocked', slug: 'blocked', icon: 'ban', group: 'specific', is_default: false, in_task_limit: false, position: 6 },
  ]

  await supabase
    .from('statuses')
    .insert(defaultStatuses.map(s => ({ ...s, organization_id: organizationId })))
}

export async function getStatuses(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Status[]> {
  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .eq('organization_id', organizationId)
    .order('position')

  if (error) {
    console.error('Error fetching statuses:', error)
    return []
  }

  return data as Status[]
}

// ============================================
// TASKS
// ============================================

export async function getTasks(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      client:clients(*),
      status:statuses(*),
      assignee:users(*)
    `)
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }

  return data as Task[]
}

export async function createTask(
  supabase: SupabaseClient,
  task: {
    organization_id: string
    title: string
    description?: string
    client_id?: string
    status_id: string
    priority?: 'low' | 'medium' | 'high'
    type?: 'client' | 'internal'
    assigned_to?: string
    created_by?: string
    due_date?: string
  }
): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select(`
      *,
      client:clients(*),
      status:statuses(*),
      assignee:users(*)
    `)
    .single()

  if (error) {
    console.error('Error creating task:', error)
    return null
  }

  return data as Task
}

export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  updates: Partial<Task>
): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select(`
      *,
      client:clients(*),
      status:statuses(*),
      assignee:users(*)
    `)
    .single()

  if (error) {
    console.error('Error updating task:', error)
    return null
  }

  return data as Task
}

export async function deleteTask(
  supabase: SupabaseClient,
  taskId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    console.error('Error deleting task:', error)
    return false
  }

  return true
}

export async function archiveTask(
  supabase: SupabaseClient,
  taskId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update({ is_archived: true })
    .eq('id', taskId)

  if (error) {
    console.error('Error archiving task:', error)
    return false
  }

  return true
}

// ============================================
// CLIENTS
// ============================================

export async function getClients(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  return data as Client[]
}

export async function createClient(
  supabase: SupabaseClient,
  client: {
    organization_id: string
    name: string
    slug?: string
    plan_id?: string
    logo_url?: string
  }
): Promise<Client | null> {
  const slug = client.slug || client.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
  
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...client, slug })
    .select(`
      *,
      plan:plans(*)
    `)
    .single()

  if (error) {
    console.error('Error creating client:', error)
    return null
  }

  return data as Client
}

export async function updateClient(
  supabase: SupabaseClient,
  clientId: string,
  updates: Partial<Client>
): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select(`
      *,
      plan:plans(*)
    `)
    .single()

  if (error) {
    console.error('Error updating client:', error)
    return null
  }

  return data as Client
}

export async function deleteClient(
  supabase: SupabaseClient,
  clientId: string
): Promise<boolean> {
  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('clients')
    .update({ is_active: false })
    .eq('id', clientId)

  if (error) {
    console.error('Error deleting client:', error)
    return false
  }

  return true
}

// ============================================
// PLANS
// ============================================

export async function getPlans(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('price_cents')

  if (error) {
    console.error('Error fetching plans:', error)
    return []
  }

  return data as Plan[]
}

export async function createDefaultPlans(
  supabase: SupabaseClient,
  organizationId: string
): Promise<void> {
  const defaultPlans = [
    { name: 'Starter', description: 'For small projects', price_cents: 49900, billing_period: 'monthly', task_limit: 3 },
    { name: 'Growth', description: 'For growing teams', price_cents: 99900, billing_period: 'monthly', task_limit: 5 },
    { name: 'Scale', description: 'For agencies', price_cents: 199900, billing_period: 'monthly', task_limit: 10 },
  ]

  await supabase
    .from('plans')
    .insert(defaultPlans.map(p => ({ 
      ...p, 
      organization_id: organizationId,
      permissions: {
        can_create_tasks: true,
        can_change_status: true,
        can_manage_plans: true,
        can_pause_subscription: true
      }
    })))
}

// ============================================
// USERS / TEAM
// ============================================

export async function getTeamMembers(
  supabase: SupabaseClient,
  organizationId: string
): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at')

  if (error) {
    console.error('Error fetching team members:', error)
    return []
  }

  return data as User[]
}

export async function getCurrentUser(
  supabase: SupabaseClient,
  userId: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching current user:', error)
    return null
  }

  return data as User
}
