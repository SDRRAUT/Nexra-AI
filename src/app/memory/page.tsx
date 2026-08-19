'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format } from 'date-fns'

interface Memory {
  id: string; content: string; category?: string; importance: string; tags?: string; createdAt: string; accessCount: number
}

const importanceColors: Record<string, string> = {
  critical: 'var(--priority-critical)', high: 'var(--priority-high)',
  medium: 'var(--priority-medium)', low: 'var(--priority-low)'
}

const categoryEmojis: Record<string, string> = {
  goal: '🎯', preference: '💡', commitment: '📌', fact: '📝', pattern: '🔄', decision: '⚡', deadline: '⏰'
}

export default function MemoryPage() {
  const router = useRouter()
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newMemory, setNewMemory] = useState({ content: '', category: 'fact', importance: 'medium' })

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memory')
      const data = await res.json()
      setMemories(data)
    } catch (e) { } finally { setLoading(false) }
  }

  useEffect(() => { fetchMemories() }, [])

  const deleteMemory = async (id: string, content: string) => {
    if (confirm(`⚠️ Are you sure you want to permanently delete this memory:\n"${content.slice(0, 50)}..."?`)) {
      await fetch('/api/memory', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      fetchMemories()
    }
  }

  const addMemory = async () => {
    if (!newMemory.content.trim()) return
    await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMemory) })
    setNewMemory({ content: '', category: 'fact', importance: 'medium' })
    setShowAdd(false)
    fetchMemories()
  }

  const filtered = filter === 'all' ? memories : memories.filter(m => m.category === filter)
  const categories = [...new Set(memories.map(m => m.category).filter(Boolean))]

  return (
    <div className="app-shell">
      <AppHeader title="Memory" subtitle={`${memories.length} memories stored`} showBrand={false} showBack />

      <div className="page-content">
        <div className="page-section" style={{ marginTop: 'var(--space-4)' }}>

          <div style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(236,72,153,0.15)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>🧠 What Srushti remembers</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
              Srushti uses these memories to understand your context and give better answers. You can delete any memory at any time.
            </div>
          </div>

          {/* Filter chips */}
          <div className="quick-actions" style={{ marginBottom: 'var(--space-4)' }}>
            <button onClick={() => setFilter('all')} className="quick-action-chip" style={{ background: filter === 'all' ? 'var(--brand-primary)' : undefined, color: filter === 'all' ? 'white' : undefined }}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilter(cat!)} className="quick-action-chip" style={{ background: filter === cat ? 'var(--brand-primary)' : undefined, color: filter === cat ? 'white' : undefined }}>
                {categoryEmojis[cat!] || '📄'} {cat}
              </button>
            ))}
          </div>

          {/* Add memory button */}
          <button className="btn btn-secondary btn-full" onClick={() => setShowAdd(true)} style={{ marginBottom: 'var(--space-4)' }}>
            + Add memory manually
          </button>

          {loading && <><div className="skeleton" style={{ height: 80, marginBottom: 8, borderRadius: 12 }} /><div className="skeleton" style={{ height: 80, borderRadius: 12 }} /></>}

          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🧠</div>
              <div className="empty-title">No memories yet</div>
              <div className="empty-sub">Tell Srushti important things about your life and she'll remember them.</div>
              <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => router.push('/chat')}>Talk to Srushti</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {filtered.map(memory => (
              <div key={memory.id} className="card fade-in-up">
                <div className="card-body-sm">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{categoryEmojis[memory.category || ''] || '📄'}</span>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                          {memory.category || 'general'}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: importanceColors[memory.importance], background: importanceColors[memory.importance] + '18', padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>
                          {memory.importance}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {memory.content}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 6 }}>
                        {format(new Date(memory.createdAt), 'MMM d, yyyy')} · Accessed {memory.accessCount} times
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMemory(memory.id, memory.content)}
                      style={{ color: 'var(--text-tertiary)', fontSize: 18, padding: 4, flexShrink: 0 }}
                      id={`delete-memory-${memory.id}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Memory Sheet */}
      {showAdd && (
        <>
          <div className="sheet-overlay" onClick={() => setShowAdd(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Add Memory</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">What should Srushti remember?</label>
                <textarea className="input" rows={3} placeholder="e.g. I have CAO exam on September 12..." value={newMemory.content} onChange={e => setNewMemory(p => ({ ...p, content: e.target.value }))} style={{ resize: 'none' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select className="input" value={newMemory.category} onChange={e => setNewMemory(p => ({ ...p, category: e.target.value }))}>
                  {['fact', 'goal', 'commitment', 'preference', 'deadline', 'pattern', 'decision'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Importance</label>
                <select className="input" value={newMemory.importance} onChange={e => setNewMemory(p => ({ ...p, importance: e.target.value }))}>
                  {['low', 'medium', 'high', 'critical'].map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-full" onClick={addMemory}>Save Memory</button>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
