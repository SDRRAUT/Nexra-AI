'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import TaskBombFuse from '@/components/tasks/TaskBombFuse'
import { format } from 'date-fns'

import {
  getClientTasks,
  toggleClientTask,
  deleteClientTask,
  createClientTask,
  updateClientTask,
} from '@/lib/data/clientData'

interface Task {
  id: string; title: string; priority: string; status: string
  deadline?: string; scheduledStart?: string; estimatedMinutes?: number
  category?: string; description?: string; postponeCount: number; isAiGenerated?: boolean
}

const priorityColors: Record<string, string> = {
  critical: 'var(--priority-critical)', high: 'var(--priority-high)',
  medium: 'var(--priority-medium)', low: 'var(--priority-low)'
}
const priorityBg: Record<string, string> = {
  critical: 'var(--priority-critical-bg)', high: 'var(--priority-high-bg)',
  medium: 'var(--priority-medium-bg)', low: 'var(--priority-low-bg)'
}

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', category: '' })

  const fetchTasks = async () => {
    try {
      // 1. Load from local IndexedDB
      const allTasks = await getClientTasks()
      let filtered = allTasks

      if (filter === 'overdue') {
        const now = new Date().toISOString()
        filtered = allTasks.filter(t => t.deadline && t.deadline < now && t.status !== 'completed')
      } else if (filter !== 'all') {
        filtered = allTasks.filter(t => t.status === filter)
      }

      setTasks(filtered as any)

      // 2. Also try API if server running
      const url = filter === 'all' ? '/api/tasks' : `/api/tasks?status=${filter}`
      const res = await fetch(url).then(r => r.json()).catch(() => null)
      if (Array.isArray(res)) setTasks(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
    const handleDataChanged = () => {
      fetchTasks()
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [filter])

  const handleComplete = async (task: Task) => {
    const isNowCompleted = task.status !== 'completed'
    await toggleClientTask(task.id, isNowCompleted).catch(() => {})

    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isNowCompleted ? 'completed' : 'planned' }),
    }).catch(() => {})

    fetchTasks()
  }

  const handleDelete = async (id: string, title?: string) => {
    if (confirm(`Delete task "${title || 'this task'}"?`)) {
      await deleteClientTask(id).catch(() => {})
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' }).catch(() => {})
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }
      fetchTasks()
    }
  }

  const handleSaveEditTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return
    await updateClientTask(editingTask.id, {
      title: editingTask.title,
      priority: editingTask.priority,
      category: editingTask.category,
      estimatedMinutes: Number(editingTask.estimatedMinutes) || 30,
      scheduledStart: editingTask.scheduledStart || undefined,
      deadline: editingTask.deadline || undefined,
    }).catch(() => {})

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('srushti_data_changed'))
    }
    setEditingTask(null)
    fetchTasks()
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    await createClientTask(newTask).catch(() => {})
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    }).catch(() => {})

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('srushti_data_changed'))
    }

    setNewTask({ title: '', priority: 'medium', category: '' })
    setShowAddSheet(false)
    fetchTasks()
  }

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'planned', label: 'Planned' },
    { key: 'in_progress', label: 'Active' },
    { key: 'completed', label: 'Done' },
    { key: 'overdue', label: 'Overdue' },
  ]

  const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )

  return (
    <div className="app-shell">
      <AppHeader
        title="Tasks"
        showBrand={false}
      />

      <div className="page-content">
        {/* Filter pills */}
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>
          <div className="quick-actions">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className="quick-action-chip" style={{
                background: filter === f.key ? 'var(--brand-primary)' : undefined,
                color: filter === f.key ? 'white' : undefined,
                borderColor: filter === f.key ? 'var(--brand-primary)' : undefined,
              }} id={`tasks-filter-${f.key}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="page-section">
          <div className="stat-grid">
            <div className="stat-card fade-in-up">
              <div className="stat-label">Total</div>
              <div className="stat-value">{tasks.length}</div>
            </div>
            <div className="stat-card fade-in-up">
              <div className="stat-label">Done</div>
              <div className="stat-value stat-positive">{tasks.filter(t => t.status === 'completed').length}</div>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="page-section">
          {loading && (
            <>
              <div className="skeleton" style={{ height: 72, marginBottom: 8, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 72, marginBottom: 8, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 72, borderRadius: 12 }} />
            </>
          )}

          {!loading && tasks.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No tasks</div>
              <div className="empty-sub">Add a task manually or tell Nexra what you're working on.</div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button className="btn btn-secondary" onClick={() => setShowAddSheet(true)}>Add task</button>
                <button className="btn btn-primary" onClick={() => router.push('/chat')}>Ask Nexra</button>
              </div>
            </div>
          )}

          {!loading && tasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map(task => (
                <div key={task.id} className="task-card-wrapper fade-in-up">
                  <TaskBombFuse task={task} />
                  <div className="task-item">
                    <div
                      className={`task-checkbox ${task.status === 'completed' ? 'completed' : ''}`}
                      onClick={() => handleComplete(task)}
                      style={{ borderColor: task.status !== 'completed' ? priorityColors[task.priority] : undefined }}
                    />
                    <div className="task-content" onClick={() => router.push(`/tasks/${task.id}`)}>
                      <div className={`task-title ${task.status === 'completed' ? 'completed' : ''}`}>{task.title}</div>
                      <div className="task-meta">
                        <span style={{
                          fontSize: 'var(--text-xs)', fontWeight: 600,
                          color: priorityColors[task.priority], background: priorityBg[task.priority],
                          padding: '1px 6px', borderRadius: 'var(--radius-full)'
                        }}>{task.priority}</span>
                        {task.deadline && <span className="task-time">Due {format(new Date(task.deadline), 'MMM d')}</span>}
                        {task.scheduledStart && <span className="task-time">{format(new Date(task.scheduledStart), 'h:mm a')}</span>}
                        {task.isAiGenerated && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-primary)' }}>🌱 AI</span>}
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)
                        }}
                        style={{
                          padding: '4px 8px',
                          color: 'var(--text-tertiary)',
                          flexShrink: 0,
                          fontSize: 16,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        id={`menu-task-${task.id}`}
                      >
                        ⋮
                      </button>

                      {activeMenuTaskId === task.id && (
                        <div
                          className="card fade-in-up"
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 2px)',
                            right: 0,
                            zIndex: 50,
                            minWidth: 130,
                            padding: 4,
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-xl)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTask({ ...task })
                              setActiveMenuTaskId(null)
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-primary)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(task.id)
                              setActiveMenuTaskId(null)
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              background: 'transparent',
                              border: 'none',
                              color: '#EF4444',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'left',
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            <span>🗑️</span>
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Task Bottom Sheet */}
      {showAddSheet && (
        <>
          <div className="sheet-overlay" onClick={() => setShowAddSheet(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
              New Task
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">What do you need to do?</label>
                <input
                  id="new-task-title"
                  className="input"
                  placeholder="Task title..."
                  value={newTask.title}
                  onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Priority</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {['critical', 'high', 'medium', 'low'].map(p => (
                    <button key={p} onClick={() => setNewTask(prev => ({ ...prev, priority: p }))} style={{
                      flex: 1, padding: 'var(--space-2)', borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)', fontWeight: 600,
                      background: newTask.priority === p ? priorityColors[p] : priorityBg[p],
                      color: newTask.priority === p ? 'white' : priorityColors[p],
                      border: `1.5px solid ${priorityColors[p]}`,
                      transition: 'all var(--transition-fast)',
                    }} id={`priority-${p}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Category (optional)</label>
                <input
                  className="input"
                  placeholder="study, work, personal..."
                  value={newTask.category}
                  onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
                />
              </div>
              <button className="btn btn-primary btn-full" onClick={handleAddTask} id="save-task-btn">
                Add Task
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => { setShowAddSheet(false); router.push('/chat') }}>
                Or tell Nexra instead
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Task Bottom Sheet */}
      {editingTask && (
        <>
          <div className="sheet-overlay" onClick={() => setEditingTask(null)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                ✏️ Edit Task
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                style={{ border: 'none', background: 'none', fontSize: 18, color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Task Title</label>
                <input
                  className="input"
                  value={editingTask.title || ''}
                  onChange={e => setEditingTask((p: any) => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label">Priority</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {['critical', 'high', 'medium', 'low'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditingTask((prev: any) => ({ ...prev, priority: p }))}
                      style={{
                        flex: 1,
                        padding: 'var(--space-2)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: editingTask.priority === p ? priorityColors[p] : priorityBg[p],
                        color: editingTask.priority === p ? 'white' : priorityColors[p],
                        border: `1.5px solid ${priorityColors[p]}`,
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Category</label>
                <input
                  className="input"
                  placeholder="study, work, health, general..."
                  value={editingTask.category || ''}
                  onChange={e => setEditingTask((p: any) => ({ ...p, category: e.target.value }))}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Estimated Minutes</label>
                <input
                  type="number"
                  className="input"
                  value={editingTask.estimatedMinutes || 30}
                  onChange={e => setEditingTask((p: any) => ({ ...p, estimatedMinutes: Number(e.target.value) }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={handleSaveEditTask}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating Action Button (FAB) anchored at bottom-right directly above BottomNav */}
      <button
        className="home-floating-add-btn fade-in-up"
        onClick={() => setShowAddSheet(true)}
        title="Quick Add Task"
        id="tasks-fab-add-task"
        aria-label="Quick Add Task"
      >
        <PlusIcon />
      </button>

      <BottomNav />
    </div>
  )
}
