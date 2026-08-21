'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format } from 'date-fns'
import { localDb } from '@/lib/db/localDb'

interface AgentAction {
  id: string; agentName: string; actionType: string; description: string
  status: string; canUndo: boolean; undoneAt?: string; createdAt: string
}

const agentColors: Record<string, string> = {
  task_agent: '#6366F1', schedule_agent: '#8B5CF6', reminder_agent: '#F59E0B',
  memory_agent: '#EC4899', study_agent: '#10B981', goal_agent: '#3B82F6',
  main_assistant: '#5B6BF0', productivity_agent: '#F97316',
}

const agentEmoji: Record<string, string> = {
  task_agent: '📋', schedule_agent: '📅', reminder_agent: '🔔', memory_agent: '🧠',
  study_agent: '📚', goal_agent: '🎯', main_assistant: '🌱', productivity_agent: '📊',
}

export default function AgentsPage() {
  const router = useRouter()
  const [actions, setActions] = useState<AgentAction[]>([])
  const [loading, setLoading] = useState(true)

  const loadActions = async () => {
    try {
      const [tasks, memories, goals, habits, events] = await Promise.all([
        localDb.tasks.toArray().catch(() => []),
        localDb.memories.toArray().catch(() => []),
        localDb.goals.toArray().catch(() => []),
        localDb.habits.toArray().catch(() => []),
        localDb.events.toArray().catch(() => []),
      ])

      const generatedActions: AgentAction[] = []

      tasks.forEach(t => {
        generatedActions.push({
          id: 'act-t-' + t.id,
          agentName: 'task_agent',
          actionType: t.status === 'completed' ? 'task_completed' : 'task_created',
          description: `${t.status === 'completed' ? 'Completed' : 'Scheduled'} task "${t.title}" (${t.priority} priority)`,
          status: t.status === 'completed' ? 'executed' : 'scheduled',
          canUndo: true,
          createdAt: t.createdAt || new Date().toISOString(),
        })
      })

      memories.forEach(m => {
        generatedActions.push({
          id: 'act-m-' + m.id,
          agentName: 'memory_agent',
          actionType: 'memory_saved',
          description: `Saved knowledge memory: "${m.content.slice(0, 45)}..."`,
          status: 'executed',
          canUndo: false,
          createdAt: m.createdAt || new Date().toISOString(),
        })
      })

      goals.forEach(g => {
        generatedActions.push({
          id: 'act-g-' + g.id,
          agentName: 'goal_agent',
          actionType: 'goal_aligned',
          description: `Aligned strategy goal "${g.title}" with target progress ${g.progress}%`,
          status: 'executed',
          canUndo: false,
          createdAt: g.createdAt || new Date().toISOString(),
        })
      })

      generatedActions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setActions(generatedActions)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActions()
    const handleDataChanged = () => {
      loadActions()
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [])

  const groupByDate = (actions: AgentAction[]) => {
    const groups: Record<string, AgentAction[]> = {}
    actions.forEach(a => {
      const dateKey = format(new Date(a.createdAt), 'yyyy-MM-dd')
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(a)
    })
    return groups
  }

  const grouped = groupByDate(actions)

  const handleUndo = async (actionId: string) => {
    try {
      const res = await fetch('/api/agents/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      })
      if (res.ok) {
        setActions(prev =>
          prev.map(a => (a.id === actionId ? { ...a, undoneAt: new Date().toISOString(), status: 'undone' } : a))
        )
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="app-shell">
      <AppHeader title="Agent Activity" subtitle="What Srushti has been doing" showBrand={false} showBack />

      <div className="page-content">
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          {/* Agent legend */}
          <div className="quick-actions" style={{ marginBottom: 'var(--space-5)' }}>
            {Object.entries(agentEmoji).map(([name, emoji]) => (
              <div key={name} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', background: (agentColors[name] || '#6366F1') + '15',
                borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600,
                color: agentColors[name] || '#6366F1', border: `1px solid ${(agentColors[name] || '#6366F1')}25`,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {emoji} {name.replace('_agent', '').replace('_', ' ')}
              </div>
            ))}
          </div>

          {loading && (
            <><div className="skeleton" style={{ height: 80, marginBottom: 8, borderRadius: 12 }} /><div className="skeleton" style={{ height: 80, borderRadius: 12 }} /></>
          )}

          {!loading && actions.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <div className="empty-title">No agent activity yet</div>
              <div className="empty-sub">Srushti's activity log will appear here when she takes actions on your behalf.</div>
              <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => router.push('/chat')}>Talk to Srushti</button>
            </div>
          )}

          {Object.entries(grouped).map(([date, dayActions]) => (
            <div key={date} style={{ marginBottom: 'var(--space-5)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 'var(--space-3)' }}>
                {format(new Date(date), 'EEEE, MMMM d')}
              </div>
              <div className="card fade-in-up">
                {dayActions.map(action => (
                  <div key={action.id} className="agent-log-item" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0,
                      background: (agentColors[action.agentName] || '#6366F1') + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>
                      {agentEmoji[action.agentName] || '🤖'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{
                            fontSize: 'var(--text-xs)', fontWeight: 700,
                            color: agentColors[action.agentName] || '#6366F1',
                          }}>
                            {action.agentName.replace('_agent', '').toUpperCase().replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                            {format(new Date(action.createdAt), 'h:mm a')}
                          </span>
                          {action.undoneAt && (
                            <span style={{ fontSize: '10px', color: 'var(--priority-high)', background: 'var(--priority-high-bg)', padding: '1px 6px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                              Undone
                            </span>
                          )}
                        </div>

                        {action.canUndo && !action.undoneAt && (
                          <button
                            onClick={() => handleUndo(action.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            Undo ↩
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {action.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 4 }}>
                        <span style={{
                          fontSize: 'var(--text-xs)', fontWeight: 600, fontFamily: 'monospace',
                          color: 'var(--text-tertiary)', background: 'var(--bg-muted)', padding: '1px 6px', borderRadius: 4,
                        }}>{action.actionType}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
