'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Search, Filter, Plus, Paperclip, MessageSquare, Calendar, X, User as UserIcon,
  Eye, EyeOff, Send, Upload, MoreHorizontal, CheckCircle2, Circle, Clock,
  AlertCircle, Users, Briefcase, Settings, LayoutGrid, List, Archive,
  ChevronRight, FolderOpen, Home, FileText, MessageCircle, Loader,
  HelpCircle, ExternalLink, Ban, LogOut
} from 'lucide-react'

// Mock data for now - will be replaced with Supabase queries
const mockTasks = [
  {
    id: '1',
    title: 'Website Redesign - Homepage',
    description: 'Complete overhaul of the main landing page with new brand guidelines',
    status: 'in-progress',
    priority: 'high' as const,
    type: 'client' as const,
    client: 'Acme Corp',
    clientPlan: 'Scale',
    assignee: 'Sarah M.',
    service: 'Web Design',
    dueDate: '2026-01-20',
    attachments: [
      { id: '1', name: 'homepage-wireframe.fig', size: '4.2 MB', date: 'Jan 14' },
    ],
    comments: [
      { id: '1', author: 'Sarah M.', content: 'Started wireframes', isInternal: true, time: '2h ago' },
    ],
    createdAt: '2026-01-10',
  },
  {
    id: '2',
    title: 'Q1 Marketing Strategy',
    description: 'Develop comprehensive marketing plan',
    status: 'todo',
    priority: 'medium' as const,
    type: 'internal' as const,
    client: null,
    clientPlan: null,
    assignee: 'Mike R.',
    service: 'Strategy',
    dueDate: '2026-01-25',
    attachments: [],
    comments: [],
    createdAt: '2026-01-12',
  },
  {
    id: '3',
    title: 'Mobile App Bug Fixes',
    description: 'Address critical bugs in v2.3.1',
    status: 'internal-review',
    priority: 'high' as const,
    type: 'client' as const,
    client: 'TechStart Inc',
    clientPlan: 'Growth',
    assignee: 'Alex K.',
    service: 'Development',
    dueDate: '2026-01-18',
    attachments: [],
    comments: [
      { id: '1', author: 'Alex K.', content: 'Fixed 3/5 bugs', isInternal: true, time: '30m ago' },
    ],
    createdAt: '2026-01-14',
  },
  {
    id: '4',
    title: 'Brand Guidelines',
    description: 'Create brand guidelines PDF',
    status: 'awaiting-feedback',
    priority: 'medium' as const,
    type: 'client' as const,
    client: 'Acme Corp',
    clientPlan: 'Scale',
    assignee: 'Emma L.',
    service: 'Branding',
    dueDate: '2026-01-22',
    attachments: [],
    comments: [],
    createdAt: '2026-01-11',
  },
  {
    id: '5',
    title: 'API Integration',
    description: 'Payment gateway setup',
    status: 'blocked',
    priority: 'high' as const,
    type: 'client' as const,
    client: 'ShopEasy',
    clientPlan: 'Starter',
    assignee: 'Alex K.',
    service: 'Development',
    dueDate: '2026-01-28',
    attachments: [],
    comments: [],
    createdAt: '2026-01-15',
  },
]

const statusColumns = [
  { id: 'not-started', label: 'Not started', icon: Circle, group: 'beginning' },
  { id: 'todo', label: 'To do', icon: Clock, group: 'in-progress' },
  { id: 'in-progress', label: 'In Progress', icon: Loader, group: 'in-progress' },
  { id: 'internal-review', label: 'Internal Review', icon: Eye, group: 'in-progress' },
  { id: 'awaiting-feedback', label: 'Awaiting feedback', icon: HelpCircle, group: 'in-progress' },
  { id: 'done', label: 'Done', icon: CheckCircle2, group: 'end' },
  { id: 'blocked', label: 'Blocked', icon: Ban, group: 'specific' },
]

const clientPlans = [
  { id: 'scale', name: 'Scale', clients: ['Acme Corp'] },
  { id: 'growth', name: 'Growth', clients: ['TechStart Inc'] },
  { id: 'starter', name: 'Starter', clients: ['ShopEasy'] },
]

const priorityConfig = {
  low: { label: 'Low' },
  medium: { label: 'Medium' },
  high: { label: 'High' },
}

// Task Card Component
function TaskCard({ task, onClick }: { task: typeof mockTasks[0]; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-700 transition-all group"
    >
      {task.client && (
        <p className="text-xs text-zinc-500 mb-1.5">{task.client}</p>
      )}
      <h4 className="text-sm text-white font-medium mb-2 leading-snug">{task.title}</h4>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip size={12} />
              {task.attachments.length}
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {task.comments.length}
            </span>
          )}
        </div>
        {task.assignee && (
          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-medium text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.assignee.split(' ').map(n => n[0]).join('')}
          </div>
        )}
      </div>
    </div>
  )
}

// Kanban Column
function KanbanColumn({ 
  column, 
  tasks, 
  onTaskClick, 
  onAddTask 
}: { 
  column: typeof statusColumns[0]
  tasks: typeof mockTasks
  onTaskClick: (task: typeof mockTasks[0]) => void
  onAddTask: () => void
}) {
  const IconComponent = column.icon
  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <IconComponent size={16} className="text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300">{column.label}</span>
          <span className="text-xs text-zinc-600">{tasks.length}</span>
        </div>
        <button 
          onClick={onAddTask}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {tasks.length === 0 && (
          <button 
            onClick={onAddTask}
            className="w-full p-3 border border-dashed border-zinc-800 rounded-lg text-zinc-600 hover:border-zinc-700 hover:text-zinc-500 transition-colors flex items-center justify-center"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// Task Detail Panel
function TaskDetail({ 
  task, 
  onClose 
}: { 
  task: typeof mockTasks[0]
  onClose: () => void 
}) {
  const [newComment, setNewComment] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(true)
  const status = statusColumns.find(s => s.id === task.status)
  const StatusIcon = status?.icon || Circle

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 h-full overflow-y-auto animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">{task.client}</span>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5">
          <h2 className="text-xl font-semibold text-white mb-2">{task.title}</h2>
          <p className="text-zinc-400 text-sm mb-6">{task.description}</p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4">
              <span className="w-24 text-sm text-zinc-500">Status</span>
              <span className="text-sm text-white flex items-center gap-2">
                <StatusIcon size={14} className="text-zinc-400" />
                {status?.label}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-24 text-sm text-zinc-500">Priority</span>
              <span className="text-sm text-white">{priorityConfig[task.priority].label}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-24 text-sm text-zinc-500">Assignee</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-medium text-zinc-300">
                  {task.assignee?.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-sm text-white">{task.assignee}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-24 text-sm text-zinc-500">Service</span>
              <span className="text-sm text-white">{task.service}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-24 text-sm text-zinc-500">Due Date</span>
              <span className="text-sm text-white">{task.dueDate}</span>
            </div>
          </div>
          
          {/* Attachments */}
          <div className="mb-8">
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Attachments</h3>
            <div className="space-y-2">
              {task.attachments.map(att => (
                <div key={att.id} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                  <Paperclip size={14} className="text-zinc-500" />
                  <div className="flex-1">
                    <p className="text-sm text-white">{att.name}</p>
                    <p className="text-xs text-zinc-500">{att.size}</p>
                  </div>
                </div>
              ))}
              <button className="w-full p-3 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:border-zinc-600 text-sm flex items-center justify-center gap-2">
                <Upload size={14} />
                Upload file
              </button>
            </div>
          </div>
          
          {/* Comments */}
          <div>
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Comments</h3>
            <div className="space-y-3 mb-4">
              {task.comments.map(comment => (
                <div key={comment.id} className={`p-3 rounded-lg ${comment.isInternal ? 'bg-amber-950/20 border border-amber-900/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-white">{comment.author}</span>
                    <span className="text-xs text-zinc-500">{comment.time}</span>
                    {comment.isInternal && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-900/50 text-amber-400">Internal</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300">{comment.content}</p>
                </div>
              ))}
            </div>
            
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full p-3 bg-transparent text-white text-sm placeholder-zinc-500 resize-none focus:outline-none"
                rows={2}
              />
              <div className="flex items-center justify-between p-2 border-t border-zinc-800">
                <button
                  onClick={() => setIsInternalComment(!isInternalComment)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs ${
                    isInternalComment ? 'bg-amber-950/50 text-amber-400' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {isInternalComment ? <EyeOff size={12} /> : <Eye size={12} />}
                  {isInternalComment ? 'Internal' : 'Public'}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-900 rounded text-xs font-medium">
                  <Send size={12} />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// New Task Modal
function NewTaskModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">New Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <input type="text" placeholder="Task title" className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none" />
          <textarea placeholder="Description" rows={3} className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-500 resize-none focus:outline-none" />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Status</label>
              <select className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm">
                {statusColumns.filter(s => s.group !== 'specific').map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Priority</label>
              <select className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Assignee</label>
              <select className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm">
                <option>Sarah M.</option>
                <option>Mike R.</option>
                <option>Alex K.</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Due Date</label>
              <input type="date" className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm" />
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 text-sm">Cancel</button>
          <button className="px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-medium">Create Task</button>
        </div>
      </div>
    </div>
  )
}

// Main Dashboard Component
export default function DashboardClient({ user, children }: { user: User; children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  
  const [activeView, setActiveView] = useState('tasks')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedTask, setSelectedTask] = useState<typeof mockTasks[0] | null>(null)
  const [showNewTask, setShowNewTask] = useState(false)
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({ scale: true, growth: true, starter: true })
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showFilters, setShowFilters] = useState(false)
  const [showDisplay, setShowDisplay] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const filteredTasks = useMemo(() => {
    let tasks = [...mockTasks]
    if (activeView === 'internal') {
      tasks = tasks.filter(t => t.type === 'internal')
    } else if (activeView.startsWith('client-')) {
      const clientName = activeView.replace('client-', '')
      tasks = tasks.filter(t => t.client === clientName)
    }
    if (activeTab === 'internal') {
      tasks = tasks.filter(t => t.type === 'internal')
    }
    return tasks
  }, [activeView, activeTab])

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, typeof mockTasks> = {}
    statusColumns.forEach(col => {
      grouped[col.id] = filteredTasks.filter(t => t.status === col.id)
    })
    return grouped
  }, [filteredTasks])

  const mainStatusColumns = statusColumns.filter(s => s.group !== 'specific')

  return (
    <div className="h-screen w-full bg-zinc-950 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <Briefcase size={16} className="text-zinc-950" />
            </div>
            <span className="font-semibold text-white">TaskFlow</span>
          </div>
        </div>
        
        <div className="px-3 py-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input type="text" placeholder="Search..." className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none" />
          </div>
        </div>
        
        <nav className="flex-1 p-2 overflow-y-auto">
          <button
            onClick={() => setActiveView('tasks')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${activeView === 'tasks' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
          >
            <CheckCircle2 size={18} />
            <span className="text-sm">Tasks</span>
          </button>
          
          <div className="mt-4">
            <div className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Active Customers</div>
            {clientPlans.map(plan => (
              <div key={plan.id}>
                <button
                  onClick={() => setExpandedPlans(prev => ({ ...prev, [plan.id]: !prev[plan.id] }))}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                  <ChevronRight size={14} className={`transition-transform ${expandedPlans[plan.id] ? 'rotate-90' : ''}`} />
                  <FolderOpen size={16} />
                  <span className="text-sm flex-1 text-left">{plan.name}</span>
                  <span className="text-xs text-zinc-600">{plan.clients.length}</span>
                </button>
                {expandedPlans[plan.id] && (
                  <div className="space-y-0.5">
                    {plan.clients.map(client => (
                      <button
                        key={client}
                        onClick={() => setActiveView(`client-${client}`)}
                        className={`w-full flex items-center gap-2 pl-10 pr-3 py-2 rounded-lg text-sm ${activeView === `client-${client}` ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                      >
                        {client}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 mt-1">
              <Plus size={16} className="ml-0.5" />
              <span className="text-sm">Add customer</span>
            </button>
          </div>
          
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <button
              onClick={() => setActiveView('internal')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${activeView === 'internal' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <Home size={18} />
              <span className="text-sm">Internal</span>
            </button>
          </div>
        </nav>
        
        <div className="p-2 border-t border-zinc-800">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900">
            <Users size={18} />
            <span className="text-sm">Team</span>
          </button>
          <button 
            onClick={() => router.push('/settings')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <Settings size={18} />
            <span className="text-sm">Settings</span>
          </button>
        </div>
        
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-white">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{user.email}</p>
            </div>
            <button onClick={handleSignOut} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="border-b border-zinc-800 bg-zinc-950">
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1">
              {[
                { id: 'all', label: 'All tasks' },
                { id: 'me', label: 'For me' },
                { id: 'internal', label: 'Internal' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === tab.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              {activeView.startsWith('client-') && (
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900">
                  Open client portal as customer
                  <ExternalLink size={14} />
                </button>
              )}
              
              <div className="relative">
                <button 
                  onClick={() => { setShowFilters(!showFilters); setShowDisplay(false) }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${showFilters ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                >
                  <Filter size={16} />
                  Filters
                </button>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => { setShowDisplay(!showDisplay); setShowFilters(false) }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${showDisplay ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                >
                  <Settings size={16} />
                  Display
                </button>
                
                {showDisplay && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDisplay(false)} />
                    <div className="absolute top-full right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50">
                      <div className="p-3 border-b border-zinc-800">
                        <div className="flex bg-zinc-800 rounded-lg p-1">
                          <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium ${viewMode === 'kanban' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                          >
                            <LayoutGrid size={16} />
                            Kanban
                          </button>
                          <button
                            onClick={() => setViewMode('list')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                          >
                            <List size={16} />
                            List
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden">
          {viewMode === 'kanban' ? (
            <div className="h-full p-5 overflow-x-auto hide-scrollbar">
              <div className="flex gap-4 h-full">
                {mainStatusColumns.map(column => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={tasksByStatus[column.id] || []}
                    onTaskClick={setSelectedTask}
                    onAddTask={() => setShowNewTask(true)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="flex items-center gap-4 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500 font-medium sticky top-0">
                <div className="flex-1">Title</div>
                <div className="w-24">Service</div>
                <div className="w-20">Due Date</div>
                <div className="w-16">Priority</div>
              </div>
              {filteredTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/50 cursor-pointer"
                >
                  <div className="flex-1">
                    <h4 className="text-sm text-white font-medium">{task.title}</h4>
                    {task.client && <span className="text-xs text-zinc-500">{task.client}</span>}
                  </div>
                  <span className="w-24 text-xs text-zinc-500">{task.service}</span>
                  <span className="w-20 text-xs text-zinc-500">{task.dueDate}</span>
                  <span className="w-16 text-xs text-zinc-500">{priorityConfig[task.priority].label}</span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      
      {selectedTask && <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />}
      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} />}
    </div>
  )
}
