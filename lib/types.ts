export type UserRole = 'owner' | 'admin' | 'member'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskType = 'client' | 'internal'
export type StatusGroup = 'beginning' | 'in-progress' | 'end' | 'specific'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  organization_id?: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  organization_id: string
  name: string
  description?: string
  price_cents: number
  billing_period: string
  task_limit: number
  stripe_price_id?: string
  stripe_product_id?: string
  is_active: boolean
  permissions: {
    can_create_tasks: boolean
    can_change_status: boolean
    can_manage_plans: boolean
    can_pause_subscription: boolean
  }
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  organization_id: string
  plan_id?: string
  name: string
  slug: string
  logo_url?: string
  stripe_customer_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  plan?: Plan
}

export interface Status {
  id: string
  organization_id: string
  name: string
  slug: string
  icon: string
  color: string
  group: StatusGroup
  is_default: boolean
  in_task_limit: boolean
  position: number
  created_at: string
}

export interface Task {
  id: string
  organization_id: string
  client_id?: string
  status_id?: string
  assigned_to?: string
  created_by?: string
  title: string
  description?: string
  priority: TaskPriority
  type: TaskType
  service?: string
  due_date?: string
  is_archived: boolean
  created_at: string
  updated_at: string
  // Joined data
  client?: Client
  status?: Status
  assignee?: User
  comments?: Comment[]
  attachments?: Attachment[]
  tags?: Tag[]
}

export interface Comment {
  id: string
  task_id: string
  author_id?: string
  content: string
  is_internal: boolean
  created_at: string
  updated_at: string
  author?: User
}

export interface Attachment {
  id: string
  task_id: string
  uploaded_by?: string
  file_name: string
  file_size?: number
  file_type?: string
  storage_path: string
  created_at: string
}

export interface Tag {
  id: string
  organization_id: string
  name: string
  color: string
  created_at: string
}
