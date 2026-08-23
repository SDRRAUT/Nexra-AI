'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { format } from 'date-fns'
import { localDb, type LocalMemory } from '@/lib/db/localDb'

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
  const [activeMenuMemoryId, setActiveMenuMemoryId] = useState<string | null>(null)
  const [editingMemory, setEditingMemory] = useState<any | null>(null)
  const [newMemory, setNewMemory] = useState({ content: '', category: 'fact', importance: 'medium' })

  const fetchMemories = async () => {
    try {
      // 1. Try local offline data first
      const localMems = await localDb.memories.toArray()
      if (localMems) {
        setMemories(localMems as any)
      }

      // 2. Also try API if server is running
      const res = await fetch('/api/memory').then(r => r.json()).catch(() => null)
      if (Array.isArray(res)) setMemories(res)
    } catch (e) { } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchMemories()
    const handleDataChanged = () => {
      fetchMemories()
    }
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [])

  const deleteMemory = async (id: string, content: string) => {
    if (confirm(`⚠️ Delete memory:\n"${content.slice(0, 60)}..."?`)) {
      await localDb.memories.delete(id).catch(() => {})
      await fetch('/api/memory', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }
      fetchMemories()
    }
  }

  const handleSaveEditMemory = async () => {
    if (!editingMemory || !editingMemory.content.trim()) return
    await localDb.memories.update(editingMemory.id, {
      content: editingMemory.content,
      category: editingMemory.category,
      importance: editingMemory.importance,
    }).catch(() => {})

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('srushti_data_changed'))
    }
    setEditingMemory(null)
    fetchMemories()
  }

  const addMemory = async () => {
    if (!newMemory.content.trim()) return
    const memId = 'mem-' + Date.now()
    await localDb.memories.add({
      id: memId,
      content: newMemory.content,
      category: newMemory.category,
      importance: newMemory.importance,
      accessCount: 1,
      createdAt: new Date().toISOString(),
    }).catch(() => {})

    await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMemory) }).catch(() => {})
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('srushti_data_changed'))
    }
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
              Srushti uses these memories to understand your context and give better answers. You can edit or delete any memory at any time.
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

                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenuMemoryId(activeMenuMemoryId === memory.id ? null : memory.id)
                        }}
                        style={{
                          padding: '4px 8px',
                          color: 'var(--text-tertiary)',
                          fontSize: 16,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                        id={`menu-memory-${memory.id}`}
                      >
                        ⋮
                      </button>

                      {activeMenuMemoryId === memory.id && (
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
                              setEditingMemory({ ...memory })
                              setActiveMenuMemoryId(null)
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
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
                              setActiveMenuMemoryId(null)
                              deleteMemory(memory.id, memory.content)
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--status-error, #EF4444)',
                              fontSize: '12px',
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
                <textarea className="input" rows={3} placeholder="e.g. I prefer studying in 25-minute intervals..." value={newMemory.content} onChange={e => setNewMemory(p => ({ ...p, content: e.target.value }))} style={{ resize: 'none' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select className="input" value={newMemory.category} onChange={e => setNewMemory(p => ({ ...p, category: e.target.value }))}>
                  {['fact', 'goal', 'commitment', 'preference', 'deadline', 'pattern', 'decision'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-full" onClick={addMemory}>Save Memory</button>
            </div>
          </div>
        </>
      )}

      {/* Edit Memory Sheet */}
      {editingMemory && (
        <>
          <div className="sheet-overlay" onClick={() => setEditingMemory(null)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                ✏️ Edit Memory
              </div>
              <button
                type="button"
                onClick={() => setEditingMemory(null)}
                style={{ border: 'none', background: 'none', fontSize: 18, color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Memory Content</label>
                <textarea
                  className="input"
                  rows={3}
                  value={editingMemory.content || ''}
                  onChange={e => setEditingMemory((p: any) => ({ ...p, content: e.target.value }))}
                  style={{ resize: 'none' }}
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label">Category</label>
                <select
                  className="input"
                  value={editingMemory.category || 'fact'}
                  onChange={e => setEditingMemory((p: any) => ({ ...p, category: e.target.value }))}
                >
                  {['fact', 'goal', 'commitment', 'preference', 'deadline', 'pattern', 'decision'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setEditingMemory(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={handleSaveEditMemory}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
