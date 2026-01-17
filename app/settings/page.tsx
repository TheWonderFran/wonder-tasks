'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Bell, Building2, Users, Palette, Globe, CreditCard,
  Zap, Receipt, Plus, GripVertical, Trash2, Circle, Clock, Loader,
  Eye, HelpCircle, CheckCircle2, Ban, Link2, EyeOff, LucideIcon
} from 'lucide-react'

const defaultStatuses = [
  { id: 'not-started', label: 'Not started', icon: Circle, group: 'beginning', default: true, inTaskLimit: false },
  { id: 'todo', label: 'To do', icon: Clock, group: 'in-progress', default: true, inTaskLimit: false },
  { id: 'in-progress', label: 'In Progress', icon: Loader, group: 'in-progress', default: false, inTaskLimit: true },
  { id: 'internal-review', label: 'Internal Review', icon: Eye, group: 'in-progress', default: false, inTaskLimit: true },
  { id: 'awaiting-feedback', label: 'Awaiting feedback', icon: HelpCircle, group: 'in-progress', default: false, inTaskLimit: true },
  { id: 'done', label: 'Done', icon: CheckCircle2, group: 'end', default: true, inTaskLimit: false },
  { id: 'blocked', label: 'Blocked', icon: Ban, group: 'specific', default: false, inTaskLimit: false },
]

const mockPlans = [
  { id: 'starter', name: 'Starter', description: 'For small projects', price: 499, taskLimit: 3, stripeLinked: false },
  { id: 'growth', name: 'Growth', description: 'For growing teams', price: 999, taskLimit: 5, stripeLinked: true },
  { id: 'scale', name: 'Scale', description: 'For agencies', price: 1999, taskLimit: 10, stripeLinked: true },
]

type SettingsSection = 
  | { id: string; label: string; icon: LucideIcon; type?: undefined }
  | { id: string; label: string; type: 'divider'; icon?: undefined }

const settingsSections: SettingsSection[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'divider1', type: 'divider', label: 'TaskFlow' },
  { id: 'agency', label: 'Agency account', icon: Building2 },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'branding', label: 'Client portal & branding', icon: Palette },
  { id: 'checkout', label: 'Checkout', icon: Globe },
  { id: 'plans', label: 'Plans and add-ons', icon: CreditCard },
  { id: 'workflow', label: 'Workflow', icon: Zap },
  { id: 'billing', label: 'Billing', icon: Receipt },
]

const statusGroups = [
  { id: 'beginning', label: 'Beginning' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'end', label: 'End' },
  { id: 'specific', label: 'Specific' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('workflow')
  const [statuses, setStatuses] = useState(defaultStatuses)
  const [plans] = useState(mockPlans)
  const [selectedPlan, setSelectedPlan] = useState<typeof mockPlans[0] | null>(null)

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Settings Sidebar */}
      <div className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back to dashboard</span>
            <span className="text-xs text-zinc-600 ml-auto">ESC</span>
          </button>
        </div>
        
        <nav className="flex-1 p-2 overflow-y-auto">
          {settingsSections.map(section => {
            if (section.type === 'divider') {
              return (
                <div key={section.id} className="px-3 py-2 mt-4 text-xs font-medium text-zinc-500">
                  {section.label}
                </div>
              )
            }
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(section.id); setSelectedPlan(null) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  activeSection === section.id 
                    ? 'bg-zinc-800 text-white' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm">{section.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
      
      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Workflow Section */}
        {activeSection === 'workflow' && (
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-semibold text-white mb-2">Workflow</h1>
            <p className="text-zinc-500 mb-8">Adapt statuses name, visibility and behavior to your agency's needs.</p>
            
            {statusGroups.map(group => (
              <div key={group.id} className="mb-6">
                <div className="bg-zinc-900 rounded-t-lg px-4 py-2 border border-zinc-800 border-b-0">
                  <span className="text-sm text-zinc-400">{group.label}</span>
                </div>
                <div className="border border-zinc-800 rounded-b-lg divide-y divide-zinc-800">
                  {statuses.filter(s => s.group === group.id).map(status => {
                    const StatusIcon = status.icon
                    return (
                      <div key={status.id} className="flex items-center gap-3 px-4 py-3">
                        <GripVertical size={16} className="text-zinc-600 cursor-grab" />
                        <StatusIcon size={16} className="text-zinc-500" />
                        <input 
                          type="text" 
                          value={status.label}
                          onChange={(e) => {
                            setStatuses(prev => prev.map(s => 
                              s.id === status.id ? { ...s, label: e.target.value } : s
                            ))
                          }}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-600 w-40"
                        />
                        {status.default && (
                          <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500">Default</span>
                        )}
                        {group.id === 'in-progress' && (
                          <button 
                            onClick={() => {
                              setStatuses(prev => prev.map(s => 
                                s.id === status.id ? { ...s, inTaskLimit: !s.inTaskLimit } : s
                              ))
                            }}
                            className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                              status.inTaskLimit 
                                ? 'bg-teal-950 text-teal-400 border border-teal-900' 
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {status.inTaskLimit ? 'Included in tasks limit' : 'Not included in tasks limit'}
                          </button>
                        )}
                        <button className="ml-auto p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                  <button className="w-full flex items-center gap-2 px-4 py-3 text-zinc-500 hover:text-white hover:bg-zinc-900/50 transition-colors">
                    <Plus size={16} />
                    <span className="text-sm">Add</span>
                  </button>
                </div>
              </div>
            ))}
            
            <div className="flex justify-end mt-6">
              <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">
                Update
              </button>
            </div>
          </div>
        )}
        
        {/* Plans Section - List */}
        {activeSection === 'plans' && !selectedPlan && (
          <div className="max-w-3xl mx-auto p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-white mb-2">Plans and add-ons</h1>
                <p className="text-zinc-500">Manage your pricing plans and connect them to Stripe.</p>
              </div>
              <button className="px-4 py-2 bg-white hover:bg-zinc-200 text-zinc-900 rounded-lg text-sm font-medium flex items-center gap-2">
                <Plus size={16} />
                Add new plan
              </button>
            </div>
            
            <div className="space-y-4">
              {plans.map(plan => (
                <div 
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">{plan.name}</h3>
                      <p className="text-sm text-zinc-500">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-white">${plan.price}</p>
                      <p className="text-xs text-zinc-500">/month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400">Task limit: <span className="text-white">{plan.taskLimit}</span></span>
                    <span className={`flex items-center gap-1.5 ${plan.stripeLinked ? 'text-teal-400' : 'text-zinc-500'}`}>
                      <Link2 size={14} />
                      {plan.stripeLinked ? 'Stripe connected' : 'Not linked to Stripe'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Plans Section - Detail */}
        {activeSection === 'plans' && selectedPlan && (
          <div className="max-w-3xl mx-auto p-8">
            <button 
              onClick={() => setSelectedPlan(null)}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">Back to plans</span>
            </button>
            
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-semibold text-white">{selectedPlan.name}</h1>
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500">stripe</span>
                <span className="text-sm text-zinc-400">Plan not linked to Stripe</span>
                <button className="text-sm text-teal-400 hover:text-teal-300">Link now</button>
                <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 flex items-center gap-1">
                  <EyeOff size={12} />
                  Plan is private
                </span>
              </div>
            </div>
            
            {/* Pricing Strategy */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-white mb-4">Pricing strategy</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <p className="text-zinc-500 text-center mb-4">You don't have any active price yet.</p>
                <button className="mx-auto flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                  <Plus size={16} />
                  <span className="text-sm">Add a new price</span>
                </button>
              </div>
            </div>
            
            {/* Details */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-white mb-4">Details</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
                <div>
                  <label className="text-sm text-zinc-500 mb-1.5 block">Name</label>
                  <input 
                    type="text"
                    defaultValue={selectedPlan.name}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-500 mb-1.5 block">Description</label>
                  <input 
                    type="text"
                    defaultValue={selectedPlan.description}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div className="flex justify-end">
                  <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Update plan
                  </button>
                </div>
              </div>
            </div>
            
            {/* Permissions */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-white mb-4">Permissions of subscribers on this plan</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
                {[
                  { id: 'createTasks', label: 'Customers can create new tasks', enabled: true },
                  { id: 'changeStatus', label: 'Customers can change tasks status', enabled: true },
                  { id: 'managePlans', label: 'Customers can manage their plans', enabled: true },
                  { id: 'pauseSub', label: "Customers can pause this plan's subscription", enabled: true },
                ].map(perm => (
                  <div key={perm.id} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{perm.label}</span>
                    <button className={`w-10 h-5 rounded-full transition-colors relative ${
                      perm.enabled ? 'bg-teal-500' : 'bg-zinc-700'
                    }`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        perm.enabled ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Update permissions
                  </button>
                </div>
              </div>
            </div>
            
            {/* Task Allowance */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-white mb-4">In progress tasks allowance</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-zinc-300">Limit the amount of tasks the subscriber can assign you at once.</p>
                    <p className="text-xs text-zinc-500">This can be changed to adapt your workflow or used as an incentive to pay a premium.</p>
                  </div>
                  <button className="w-10 h-5 rounded-full bg-teal-500 relative">
                    <div className="absolute top-0.5 left-5 w-4 h-4 rounded-full bg-white shadow" />
                  </button>
                </div>
                <input 
                  type="number"
                  defaultValue={selectedPlan.taskLimit}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600 mb-4"
                />
                <div className="flex justify-end">
                  <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors">
                    Update allowance
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Placeholder for other sections */}
        {!['workflow', 'plans'].includes(activeSection) && (
          <div className="max-w-3xl mx-auto p-8">
            <h1 className="text-2xl font-semibold text-white mb-2">
              {settingsSections.find(s => s.id === activeSection)?.label}
            </h1>
            <p className="text-zinc-500">This section is coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}
