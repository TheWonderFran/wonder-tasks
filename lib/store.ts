import { create } from 'zustand'
import type { User, Organization, Task, Client, Status, Plan } from './types'

interface AppState {
  // User & Auth
  user: User | null
  organization: Organization | null
  setUser: (user: User | null) => void
  setOrganization: (org: Organization | null) => void
  
  // Tasks
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  
  // Clients
  clients: Client[]
  setClients: (clients: Client[]) => void
  
  // Statuses
  statuses: Status[]
  setStatuses: (statuses: Status[]) => void
  updateStatus: (id: string, updates: Partial<Status>) => void
  
  // Plans
  plans: Plan[]
  setPlans: (plans: Plan[]) => void
  
  // UI State
  selectedTask: Task | null
  setSelectedTask: (task: Task | null) => void
  activeView: string
  setActiveView: (view: string) => void
  viewMode: 'kanban' | 'list'
  setViewMode: (mode: 'kanban' | 'list') => void
}

export const useStore = create<AppState>((set) => ({
  // User & Auth
  user: null,
  organization: null,
  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }),
  
  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),
  
  // Clients
  clients: [],
  setClients: (clients) => set({ clients }),
  
  // Statuses
  statuses: [],
  setStatuses: (statuses) => set({ statuses }),
  updateStatus: (id, updates) => set((state) => ({
    statuses: state.statuses.map((s) => (s.id === id ? { ...s, ...updates } : s)),
  })),
  
  // Plans
  plans: [],
  setPlans: (plans) => set({ plans }),
  
  // UI State
  selectedTask: null,
  setSelectedTask: (selectedTask) => set({ selectedTask }),
  activeView: 'tasks',
  setActiveView: (activeView) => set({ activeView }),
  viewMode: 'kanban',
  setViewMode: (viewMode) => set({ viewMode }),
}))
