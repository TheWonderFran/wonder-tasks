'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Search, Filter, Plus, Paperclip, MessageSquare, Calendar, X, User as UserIcon,
  Eye, EyeOff, MoreHorizontal, CheckCircle2, Circle, Clock,
  AlertCircle, Users, Briefcase, Settings, LayoutGrid, List, Archive,
  ChevronRight, ChevronDown, FolderOpen, Home, FileText, MessageCircle, Loader,
  HelpCircle, ExternalLink, Ban, LogOut, LucideIcon, Send, Upload, Trash2
} from 'lucide-react'
import type { Task, Client, Status, Plan, Organization, User as AppUser, Comment, Attachment } from '@/lib/types'
import {
  getTasks, createTask, updateTask, deleteTask,
  getClients, createClient as createClientApi,
  getStatuses, getPlans, getTeamMembers,
  getOrCreateOrganization, createDefaultPlans
} from '@/lib/supabase/queries'

// Icon mapping for statuses
const statusIcons: Record<string, LucideIcon> = {
  'circle': Circle,
  'clock': Clock,
  'loader': Loader,
  'eye': Eye,
  'help-circle': HelpCircle,
  'check-circle-2': CheckCircle2,
  'ban': Ban,
}

type ViewMode = 'kanban' | 'list'
type TaskFilter = 'all' | 'client' | 'internal'

interface DashboardClientProps {
  user: User
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // Core state
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [teamMembers, setTeamMembers] = useState<AppUser[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({})
  const [expandedStatuses, setExpandedStatuses] = useState<Record<string, boolean>>({})
  
  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  
  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskClient, setNewTaskClient] = useState<string>('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskType, setNewTaskType] = useState<'client' | 'internal'>('client')
  
  // New client form state
  const [newClientName, setNewClientName] = useState('')
  const [newClientPlan, setNewClientPlan] = useState<string>('')

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      const org = await getOrCreateOrganization(supabase, user.id, user.email || '')
      if (!org) {
        console.error('Failed to get/create organization')
        setLoading(false)
        return
      }
      setOrganization(org)
      
      const [tasksData, clientsData, statusesData, plansData, teamData] = await Promise.all([
        getTasks(supabase, org.id),
        getClients(supabase, org.id),
        getStatuses(supabase, org.id),
        getPlans(supabase, org.id),
        getTeamMembers(supabase, org.id)
      ])
      
      setTasks(tasksData)
      setClients(clientsData)
      setStatuses(statusesData)
      setTeamMembers(teamData)
      
      // Initialize expanded plans
      const planExpansion: Record<string, boolean> = {}
      plansData.forEach(plan => { planExpansion[plan.id] = true })
      planExpansion['no-plan'] = true
      setExpandedPlans(planExpansion)
      
      // Initialize expanded statuses for list view
      const statusExpansion: Record<string, boolean> = {}
      statusesData.forEach(status => { statusExpansion[status.id] = true })
      setExpandedStatuses(statusExpansion)
      
      if (plansData.length === 0) {
        await createDefaultPlans(supabase, org.id)
        const newPlans = await getPlans(supabase, org.id)
        setPlans(newPlans)
      } else {
        setPlans(plansData)
      }
      
      setLoading(false)
    }
    
    loadData()
  }, [user.id, user.email])

  // Load comments and attachments when task is selected
  useEffect(() => {
    async function loadTaskDetails() {
      if (!selectedTask) {
        setComments([])
        setAttachments([])
        return
      }
      
      setLoadingComments(true)
      
      // Load comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, author:users(*)')
        .eq('task_id', selectedTask.id)
        .order('created_at', { ascending: true })
      
      if (commentsData) {
        setComments(commentsData as Comment[])
      }
      
      // Load attachments
      const { data: attachmentsData } = await supabase
        .from('attachments')
        .select('*')
        .eq('task_id', selectedTask.id)
        .order('created_at', { ascending: false })
      
      if (attachmentsData) {
        setAttachments(attachmentsData as Attachment[])
      }
      
      setLoadingComments(false)
    }
    
    loadTaskDetails()
  }, [selectedTask?.id])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (selectedClient && task.client_id !== selectedClient) {
        return false
      }
      if (taskFilter === 'client' && task.type !== 'client') {
        return false
      }
      if (taskFilter === 'internal' && task.type !== 'internal') {
        return false
      }
      return true
    })
  }, [tasks, searchQuery, selectedClient, taskFilter])

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    statuses.forEach(status => {
      grouped[status.id] = filteredTasks.filter(task => task.status_id === status.id)
    })
    return grouped
  }, [filteredTasks, statuses])

  // Group clients by plan
  const clientsByPlan = useMemo(() => {
    const grouped: Record<string, Client[]> = {}
    
    // Initialize with plan IDs
    plans.forEach(plan => {
      grouped[plan.id] = []
    })
    grouped['no-plan'] = []
    
    // Group clients
    clients.forEach(client => {
      if (client.plan_id && grouped[client.plan_id]) {
        grouped[client.plan_id].push(client)
      } else {
        grouped['no-plan'].push(client)
      }
    })
    
    return grouped
  }, [clients, plans])

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(statusId)
  }

  const handleDragLeave = () => {
    setDragOverStatus(null)
  }

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault()
    setDragOverStatus(null)
    
    if (draggedTask && draggedTask.status_id !== statusId) {
      const updated = await updateTask(supabase, draggedTask.id, { status_id: statusId })
      if (updated) {
        setTasks(prev => prev.map(t => t.id === draggedTask.id ? updated : t))
      }
    }
    
    setDraggedTask(null)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDragOverStatus(null)
  }

  // Task handlers
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !organization) return
    
    let defaultStatus = statuses.find(s => s.is_default && s.group === 'beginning')
    if (!defaultStatus) defaultStatus = statuses.find(s => s.group === 'beginning')
    if (!defaultStatus) defaultStatus = statuses[0]
    
    if (!defaultStatus) return
    
    const newTask = await createTask(supabase, {
      organization_id: organization.id,
      title: newTaskTitle,
      description: newTaskDescription || undefined,
      client_id: newTaskClient || undefined,
      status_id: defaultStatus.id,
      priority: newTaskPriority,
      type: newTaskType,
      created_by: user.id
    })
    
    if (newTask) {
      setTasks(prev => [newTask, ...prev])
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskClient('')
      setNewTaskPriority('medium')
      setNewTaskType('client')
      setShowNewTaskModal(false)
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatusId: string) => {
    const updated = await updateTask(supabase, taskId, { status_id: newStatusId })
    if (updated) {
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t))
      if (selectedTask?.id === taskId) {
        setSelectedTask(updated)
      }
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const success = await deleteTask(supabase, taskId)
    if (success) {
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setSelectedTask(null)
    }
  }

  // Comment handlers
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return
    
    const { data, error } = await supabase
      .from('comments')
      .insert({
        task_id: selectedTask.id,
        author_id: user.id,
        content: newComment,
        is_internal: isInternalComment
      })
      .select('*, author:users(*)')
      .single()
    
    if (data && !error) {
      setComments(prev => [...prev, data as Comment])
      setNewComment('')
    }
  }

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedTask || !organization) return
    
    setUploadingFile(true)
    
    const fileExt = file.name.split('.').pop()
    const filePath = `${organization.id}/${selectedTask.id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file)
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      setUploadingFile(false)
      return
    }
    
    const { data: attachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        task_id: selectedTask.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath
      })
      .select()
      .single()
    
    if (attachment && !dbError) {
      setAttachments(prev => [attachment as Attachment, ...prev])
    }
    
    setUploadingFile(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Client handlers
  const handleCreateClient = async () => {
    if (!newClientName.trim() || !organization) return
    
    const newClient = await createClientApi(supabase, {
      organization_id: organization.id,
      name: newClientName,
      plan_id: newClientPlan || undefined
    })
    
    if (newClient) {
      setClients(prev => [...prev, newClient])
      setNewClientName('')
      setNewClientPlan('')
      setShowNewClientModal(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const togglePlanExpansion = (planId: string) => {
    setExpandedPlans(prev => ({ ...prev, [planId]: !prev[planId] }))
  }

  const toggleStatusExpansion = (statusId: string) => {
    setExpandedStatuses(prev => ({ ...prev, [statusId]: !prev[statusId] }))
  }

  const renderStatusIcon = (iconName: string, className?: string) => {
    const IconComponent = statusIcons[iconName] || Circle
    return <IconComponent size={16} className={className} />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <Loader className="animate-spin" size={24} />
          <span>Loading your workspace...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <Briefcase size={18} className="text-white" />
            </div>
            <span className="font-semibold text-white">TaskFlow</span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="space-y-1">
            <button 
              onClick={() => setSelectedClient(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                !selectedClient ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Home size={18} />
              <span className="text-sm">All Tasks</span>
              <span className="ml-auto text-xs text-zinc-500">{tasks.length}</span>
            </button>
          </div>
          
          {/* Clients Section - Grouped by Plan */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Clients</span>
              <button 
                onClick={() => setShowNewClientModal(true)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            
            {/* Plans as folders */}
            {plans.map(plan => {
              const planClients = clientsByPlan[plan.id] || []
              if (planClients.length === 0) return null
              
              return (
                <div key={plan.id} className="mb-2">
                  <button
                    onClick={() => togglePlanExpansion(plan.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {expandedPlans[plan.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <FolderOpen size={14} />
                    <span className="text-xs font-medium">{plan.name}</span>
                    <span className="ml-auto text-xs text-zinc-600">{planClients.length}</span>
                  </button>
                  
                  {expandedPlans[plan.id] && (
                    <div className="ml-4 space-y-1">
                      {planClients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClient(client.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                            selectedClient === client.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                          }`}
                        >
                          <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center text-xs font-medium text-white">
                            {client.name.charAt(0)}
                          </div>
                          <span className="text-sm truncate">{client.name}</span>
                          <span className="ml-auto text-xs text-zinc-500">
                            {tasks.filter(t => t.client_id === client.id).length}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            
            {/* Clients without plan */}
            {clientsByPlan['no-plan']?.length > 0 && (
              <div className="mb-2">
                <button
                  onClick={() => togglePlanExpansion('no-plan')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  {expandedPlans['no-plan'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <FolderOpen size={14} />
                  <span className="text-xs font-medium">No Plan</span>
                  <span className="ml-auto text-xs text-zinc-600">{clientsByPlan['no-plan'].length}</span>
                </button>
                
                {expandedPlans['no-plan'] && (
                  <div className="ml-4 space-y-1">
                    {clientsByPlan['no-plan'].map(client => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                          selectedClient === client.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                        <div className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center text-xs font-medium text-white">
                          {client.name.charAt(0)}
                        </div>
                        <span className="text-sm truncate">{client.name}</span>
                        <span className="ml-auto text-xs text-zinc-500">
                          {tasks.filter(t => t.client_id === client.id).length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {clients.length === 0 && (
              <p className="px-3 py-2 text-xs text-zinc-600">No clients yet</p>
            )}
          </div>
        </nav>
        
        {/* User Section */}
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-white">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user.email}</p>
              <p className="text-xs text-zinc-500">{organization?.name}</p>
            </div>
            <button 
              onClick={() => router.push('/settings')}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
            >
              <Settings size={16} />
            </button>
            <button 
              onClick={handleSignOut}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">
              {selectedClient 
                ? clients.find(c => c.id === selectedClient)?.name || 'Tasks'
                : 'All Tasks'
              }
            </h1>
            <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
              <button
                onClick={() => setTaskFilter('all')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  taskFilter === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTaskFilter('client')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  taskFilter === 'client' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Client
              </button>
              <button
                onClick={() => setTaskFilter('internal')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  taskFilter === 'internal' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Internal
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              />
            </div>
            
            <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'kanban' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List size={16} />
              </button>
            </div>
            
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Task
            </button>
          </div>
        </header>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {viewMode === 'kanban' ? (
            /* Kanban View with Drag & Drop */
            <div className="flex gap-4 h-full">
              {statuses.map(status => (
                <div 
                  key={status.id} 
                  className={`flex-shrink-0 w-72 flex flex-col rounded-xl transition-colors ${
                    dragOverStatus === status.id ? 'bg-zinc-900/50' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, status.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status.id)}
                >
                  <div className="flex items-center gap-2 mb-3 px-2">
                    {renderStatusIcon(status.icon, 'text-zinc-500')}
                    <span className="text-sm font-medium text-zinc-300">{status.name}</span>
                    <span className="text-xs text-zinc-600 ml-auto">
                      {tasksByStatus[status.id]?.length || 0}
                    </span>
                  </div>
                  <div className={`flex-1 space-y-2 overflow-auto min-h-[200px] rounded-lg p-1 ${
                    dragOverStatus === status.id ? 'ring-2 ring-teal-500/50 ring-dashed' : ''
                  }`}>
                    {tasksByStatus[status.id]?.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedTask(task)}
                        className={`p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 cursor-pointer transition-all ${
                          draggedTask?.id === task.id ? 'opacity-50 scale-95' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-medium text-white line-clamp-2">{task.title}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            task.priority === 'high' ? 'bg-red-950 text-red-400' :
                            task.priority === 'medium' ? 'bg-yellow-950 text-yellow-400' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.client && (
                              <span className="text-xs text-zinc-500">{task.client.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(task.comments?.length || 0) > 0 && (
                              <span className="flex items-center gap-1 text-xs text-zinc-500">
                                <MessageSquare size={12} />
                                {task.comments?.length}
                              </span>
                            )}
                            {(task.attachments?.length || 0) > 0 && (
                              <span className="flex items-center gap-1 text-xs text-zinc-500">
                                <Paperclip size={12} />
                                {task.attachments?.length}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              task.type === 'internal' ? 'bg-purple-950 text-purple-400' : 'bg-blue-950 text-blue-400'
                            }`}>
                              {task.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!tasksByStatus[status.id] || tasksByStatus[status.id].length === 0) && (
                      <div className="p-4 border border-dashed border-zinc-800 rounded-xl text-center">
                        <p className="text-xs text-zinc-600">No tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View - Grouped by Status */
            <div className="space-y-4">
              {statuses.map(status => {
                const statusTasks = tasksByStatus[status.id] || []
                
                return (
                  <div key={status.id} className="bg-zinc-900/50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleStatusExpansion(status.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors"
                    >
                      {expandedStatuses[status.id] ? <ChevronDown size={16} className="text-zinc-500" /> : <ChevronRight size={16} className="text-zinc-500" />}
                      {renderStatusIcon(status.icon, 'text-zinc-500')}
                      <span className="text-sm font-medium text-zinc-300">{status.name}</span>
                      <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                        {statusTasks.length}
                      </span>
                    </button>
                    
                    {expandedStatuses[status.id] && statusTasks.length > 0 && (
                      <div className="border-t border-zinc-800">
                        {statusTasks.map((task, index) => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className={`flex items-center gap-4 px-4 py-3 hover:bg-zinc-900 cursor-pointer transition-colors ${
                              index !== statusTasks.length - 1 ? 'border-b border-zinc-800/50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-white truncate">{task.title}</h3>
                            </div>
                            {task.client && (
                              <span className="text-xs text-zinc-500 px-2 py-1 bg-zinc-800 rounded">
                                {task.client.name}
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              {(task.comments?.length || 0) > 0 && (
                                <span className="flex items-center gap-1 text-xs text-zinc-500">
                                  <MessageSquare size={12} />
                                  {task.comments?.length}
                                </span>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              task.priority === 'high' ? 'bg-red-950 text-red-400' :
                              task.priority === 'medium' ? 'bg-yellow-950 text-yellow-400' :
                              'bg-zinc-800 text-zinc-400'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              
              {filteredTasks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-zinc-500">No tasks found</p>
                  <button
                    onClick={() => setShowNewTaskModal(true)}
                    className="mt-4 text-teal-400 hover:text-teal-300 text-sm"
                  >
                    Create your first task
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Task Detail Sidebar */}
      {selectedTask && (
        <div className="w-96 border-l border-zinc-800 flex flex-col bg-zinc-950">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="font-medium text-white">Task Details</h2>
            <button
              onClick={() => setSelectedTask(null)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            {/* Task Info */}
            <div className="p-4 space-y-4 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">{selectedTask.title}</h3>
                {selectedTask.description && (
                  <p className="text-sm text-zinc-400">{selectedTask.description}</p>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Status</label>
                  <select
                    value={selectedTask.status_id || ''}
                    onChange={(e) => handleUpdateTaskStatus(selectedTask.id, e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-700"
                  >
                    {statuses.map(status => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Priority</label>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map(priority => (
                      <button
                        key={priority}
                        onClick={async () => {
                          const updated = await updateTask(supabase, selectedTask.id, { priority })
                          if (updated) {
                            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updated : t))
                            setSelectedTask(updated)
                          }
                        }}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${
                          selectedTask.priority === priority
                            ? priority === 'high' ? 'bg-red-950 text-red-400 border border-red-900' :
                              priority === 'medium' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' :
                              'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Type</label>
                  <div className="flex gap-2">
                    {(['client', 'internal'] as const).map(type => (
                      <button
                        key={type}
                        onClick={async () => {
                          const updated = await updateTask(supabase, selectedTask.id, { type })
                          if (updated) {
                            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updated : t))
                            setSelectedTask(updated)
                          }
                        }}
                        className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${
                          selectedTask.type === type
                            ? type === 'internal' ? 'bg-purple-950 text-purple-400 border border-purple-900' :
                              'bg-blue-950 text-blue-400 border border-blue-900'
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {selectedTask.client && (
                  <div>
                    <label className="text-xs text-zinc-500 block mb-2">Client</label>
                    <p className="text-sm text-white">{selectedTask.client.name}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Attachments Section */}
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Paperclip size={14} />
                  Attachments
                  <span className="text-xs text-zinc-600">({attachments.length})</span>
                </h4>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  {uploadingFile ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center gap-3 p-2 bg-zinc-900 rounded-lg">
                      <FileText size={16} className="text-zinc-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{attachment.file_name}</p>
                        <p className="text-xs text-zinc-500">{formatFileSize(attachment.file_size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600 text-center py-2">No attachments</p>
              )}
            </div>
            
            {/* Comments Section */}
            <div className="p-4">
              <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-3">
                <MessageSquare size={14} />
                Comments
                <span className="text-xs text-zinc-600">({comments.length})</span>
              </h4>
              
              {loadingComments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader size={16} className="animate-spin text-zinc-500" />
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-64 overflow-auto">
                    {comments.map(comment => (
                      <div key={comment.id} className={`p-3 rounded-lg ${
                        comment.is_internal ? 'bg-purple-950/30 border border-purple-900/50' : 'bg-zinc-900'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-white">
                            {comment.author?.email?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-xs text-zinc-400">{comment.author?.email || 'Unknown'}</span>
                          {comment.is_internal && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-900/50 text-purple-400 rounded">Internal</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-300">{comment.content}</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-xs text-zinc-600 text-center py-2">No comments yet</p>
                    )}
                  </div>
                  
                  {/* Add Comment */}
                  <div className="space-y-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          checked={isInternalComment}
                          onChange={(e) => setIsInternalComment(e.target.checked)}
                          className="rounded bg-zinc-800 border-zinc-700"
                        />
                        Internal comment
                      </label>
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <Send size={12} />
                        Send
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={() => handleDeleteTask(selectedTask.id)}
              className="w-full px-4 py-2 bg-red-950 hover:bg-red-900 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={14} />
              Delete Task
            </button>
          </div>
        </div>
      )}
      
      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">New Task</h2>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">Description</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Task description (optional)"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>
              
              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">Client</label>
                <select
                  value={newTaskClient}
                  onChange={(e) => setNewTaskClient(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                >
                  <option value="">No client (Internal)</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 block mb-1.5">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 block mb-1.5">Type</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value as 'client' | 'internal')}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                  >
                    <option value="client">Client</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim()}
                className="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">New Client</h2>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">Client Name</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Enter client name"
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-sm text-zinc-400 block mb-1.5">Plan</label>
                <select
                  value={newClientPlan}
                  onChange={(e) => setNewClientPlan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                >
                  <option value="">No plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewClientModal(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClient}
                disabled={!newClientName.trim()}
                className="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
