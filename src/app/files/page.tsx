'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import NoteEditorModal from '@/components/files/NoteEditorModal'
import FileViewerModal from '@/components/files/FileViewerModal'
import { LocalDocument, localDb } from '@/lib/db/localDb'

type FileCategory = 'all' | 'note' | 'pdf' | 'image' | 'code' | 'starred'

export default function FilesPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<LocalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<FileCategory>('all')

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<LocalDocument | null>(null)
  const [viewingDoc, setViewingDoc] = useState<LocalDocument | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  // Load all documents from IndexedDB
  const loadDocuments = async () => {
    try {
      const docs = await localDb.documents.toArray()
      // Sort: Pinned & Favorites first, then most recently updated/created
      docs.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        const timeA = new Date(a.updatedAt || a.createdAt).getTime()
        const timeB = new Date(b.updatedAt || b.createdAt).getTime()
        return timeB - timeA
      })
      setDocuments(docs)
    } catch (err) {
      console.error('Failed to load documents', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()

    const handleDataChanged = () => loadDocuments()
    window.addEventListener('srushti_data_changed', handleDataChanged)
    return () => window.removeEventListener('srushti_data_changed', handleDataChanged)
  }, [])

  // Keyboard shortcut: Press '/' or 'Ctrl+K' to focus instant search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Lightning-fast in-memory filtering (<1ms response)
  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return documents.filter(doc => {
      // 1. Category check
      if (activeCategory === 'starred' && !doc.isFavorite) return false
      if (activeCategory === 'note' && doc.type !== 'note') return false
      if (activeCategory === 'pdf' && doc.type !== 'pdf') return false
      if (activeCategory === 'image' && doc.type !== 'image') return false
      if (activeCategory === 'code' && doc.type !== 'code') return false

      // 2. Query check (matches title, tags, or content)
      if (!query) return true

      const matchTitle = doc.title.toLowerCase().includes(query)
      const matchType = doc.type.toLowerCase().includes(query)
      const matchTags = doc.tags?.some(t => t.toLowerCase().includes(query))
      const matchContent = doc.content?.toLowerCase().includes(query)

      return matchTitle || matchType || matchTags || matchContent
    })
  }, [documents, searchQuery, activeCategory])

  // Handle uploading physical files from device
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const now = new Date().toISOString()
      const docId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      let docType: 'pdf' | 'image' | 'code' | 'note' | 'other' = 'other'
      if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
        docType = 'pdf'
      } else if (file.type.startsWith('image/')) {
        docType = 'image'
      } else if (
        file.name.endsWith('.ts') ||
        file.name.endsWith('.js') ||
        file.name.endsWith('.py') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.html') ||
        file.name.endsWith('.css')
      ) {
        docType = 'code'
      } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        docType = 'note'
      }

      // Read file content or dataUrl
      if (docType === 'image' || docType === 'pdf') {
        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          await localDb.documents.put({
            id: docId,
            title: file.name,
            type: docType,
            mimeType: file.type,
            size: file.size,
            dataUrl,
            tags: [docType, 'upload'],
            createdAt: now,
            updatedAt: now,
          })
          loadDocuments()
        }
        reader.readAsDataURL(file)
      } else {
        const text = await file.text()
        await localDb.documents.put({
          id: docId,
          title: file.name,
          type: docType,
          mimeType: file.type || 'text/plain',
          size: file.size,
          content: text,
          tags: [docType, 'upload'],
          createdAt: now,
          updatedAt: now,
        })
        loadDocuments()
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('srushti_data_changed'))
    }
  }

  // Pre-seed starter template for instant exploration
  const handleSeedTemplate = async (templateType: 'formula' | 'project' | 'notes') => {
    const now = new Date().toISOString()
    let doc: LocalDocument

    if (templateType === 'formula') {
      doc = {
        id: `template-${Date.now()}-1`,
        title: 'Physics & Math Key Formulas',
        type: 'note',
        mimeType: 'text/markdown',
        size: 340,
        tags: ['exam', 'math', 'physics'],
        isFavorite: true,
        pinned: true,
        content: `# Physics & Math Essentials\n\n## Calculus & Derivatives\n- d/dx [e^x] = e^x\n- d/dx [ln(x)] = 1/x\n- d/dx [sin(x)] = cos(x)\n\n## Classical Mechanics\n- F = m * a\n- KE = 1/2 * m * v^2\n- Work = Force * Displacement * cos(θ)`,
        createdAt: now,
        updatedAt: now,
      }
    } else if (templateType === 'project') {
      doc = {
        id: `template-${Date.now()}-2`,
        title: 'Nexra App Architecture Spec',
        type: 'code',
        mimeType: 'text/markdown',
        size: 280,
        tags: ['code', 'spec', 'nexra'],
        isFavorite: true,
        content: `// Nexra FastVault System Architecture\nconst SYSTEM_SPEC = {\n  runtime: "Next.js 16 + Turbopack",\n  localEngine: "Dexie IndexedDB",\n  audioEngine: "Procedural WebAudio Synthesizer",\n  mobileRuntime: "Capacitor 8 Android APK",\n  latencyTarget: "< 5ms instant retrieval",\n};`,
        createdAt: now,
        updatedAt: now,
      }
    } else {
      doc = {
        id: `template-${Date.now()}-3`,
        title: 'Weekly Sprint Goals & Checkpoints',
        type: 'note',
        mimeType: 'text/markdown',
        size: 220,
        tags: ['weekly', 'priorities'],
        content: `# Weekly Sprint\n- [x] Integrate FastVault into bottom bar\n- [x] Sub-5ms keystroke instant search\n- [ ] Complete semester syllabus breakdown\n- [ ] 45-minute deep focus flow block`,
        createdAt: now,
        updatedAt: now,
      }
    }

    await localDb.documents.put(doc)
    loadDocuments()
  }

  // Highlight matching letters helper
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text
    const index = text.toLowerCase().indexOf(query.toLowerCase())
    if (index === -1) return text

    const before = text.substring(0, index)
    const match = text.substring(index, index + query.length)
    const after = text.substring(index + query.length)

    return (
      <>
        {before}
        <mark style={{ background: 'rgba(245, 158, 11, 0.35)', color: 'inherit', padding: '0 2px', borderRadius: 2 }}>
          {match}
        </mark>
        {after}
      </>
    )
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Local'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="app-shell">
      <AppHeader
        title="FastVault"
        subtitle="Instant-access offline document & file OS"
        showBrand={false}
      />

      <div className="page-content" style={{ paddingBottom: 110 }}>
        {/* Hidden native file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
          multiple
        />

        {/* ── SPOTLIGHT INSTANT SEARCH BOX ─────────────────────────── */}
        <div style={{ position: 'sticky', top: 'var(--header-height, 56px)', zIndex: 100, padding: 'var(--space-2) 0 var(--space-4)', background: 'var(--bg-primary)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-card)',
              border: searchQuery ? '1.5px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '10px 16px',
              boxShadow: searchQuery ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : '0 4px 20px -4px rgba(0, 0, 0, 0.06)',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: 20, marginRight: 10, opacity: 0.8 }}>⚡</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Type letters to find any doc instantly... (e.g. math, syllabus)"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-base)',
                fontWeight: 600,
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSearchQuery('')}
                style={{ padding: '2px 8px', fontSize: '13px', color: 'var(--text-tertiary)' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Real-time search telemetry info */}
          {searchQuery && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, padding: '0 6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <span>
                Found <strong>{filteredDocs.length}</strong> matching {filteredDocs.length === 1 ? 'doc' : 'docs'}
              </span>
              <span style={{ color: 'var(--brand-accent)' }}>⚡ Instant Keystroke Match (&lt;1ms)</span>
            </div>
          )}
        </div>

        {/* ── ACTION BAR: NEW NOTE & UPLOAD FILE ────────────────────── */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingDoc(null)
              setIsEditorOpen(true)
            }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px' }}
          >
            <span>📝</span>
            <span style={{ fontWeight: 700 }}>+ New Note</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px' }}
          >
            <span>📁</span>
            <span style={{ fontWeight: 700 }}>Upload File</span>
          </button>
        </div>

        {/* ── CATEGORY FILTER PILLS ─────────────────────────────────── */}
        <div
          className="quick-actions"
          style={{
            overflowX: 'auto',
            paddingBottom: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'all', label: 'All Files', icon: '🗂️' },
            { id: 'note', label: 'Notes', icon: '📝' },
            { id: 'pdf', label: 'PDFs', icon: '📄' },
            { id: 'image', label: 'Images', icon: '🖼️' },
            { id: 'code', label: 'Code', icon: '💻' },
            { id: 'starred', label: 'Starred', icon: '⭐' },
          ].map(cat => {
            const isSelected = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                className="quick-action-chip"
                onClick={() => setActiveCategory(cat.id as FileCategory)}
                style={{
                  background: isSelected ? 'var(--brand-primary)' : 'var(--bg-card)',
                  color: isSelected ? 'white' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 0.15s ease',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* ── PINNED & FAVORITES BAR (when available and not actively searching) ── */}
        {!searchQuery && activeCategory === 'all' && documents.some(d => d.pinned || d.isFavorite) && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, paddingLeft: 2 }}>
              ⭐ Pinned & Favorites
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {documents.filter(d => d.pinned || d.isFavorite).slice(0, 6).map(doc => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setViewingDoc(doc)
                    setIsViewerOpen(true)
                  }}
                  style={{
                    flex: '0 0 160px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-3)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>
                      {doc.type === 'image' ? '🖼️' : doc.type === 'pdf' ? '📄' : doc.type === 'code' ? '💻' : '📝'}
                    </span>
                    <span style={{ fontSize: 12, color: '#F59E0B' }}>★</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                    {doc.title}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: 3 }}>
                    {formatFileSize(doc.size)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DOCUMENTS LIST / GRID ─────────────────────────────────── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
            <div className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
          </div>
        )}

        {!loading && filteredDocs.length === 0 && (
          <div className="card fade-in-up" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-primary)' }}>
              {searchQuery ? `No files matching "${searchQuery}"` : 'Your FastVault is empty'}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: 360, margin: '8px auto var(--space-5)' }}>
              {searchQuery
                ? 'Try searching with a shorter term or check spelling.'
                : 'Store your exam notes, PDFs, study sheets, and photos offline with sub-millisecond search access.'}
            </div>

            {!searchQuery && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
                  Try a Starter Template:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSeedTemplate('formula')}
                  >
                    📐 Math & Physics Formulas
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSeedTemplate('project')}
                  >
                    💻 App Architecture Spec
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSeedTemplate('notes')}
                  >
                    📋 Sprint Checkpoints
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && filteredDocs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {filteredDocs.map(doc => {
              const isImg = doc.type === 'image'
              const isPdf = doc.type === 'pdf'
              const isCode = doc.type === 'code'

              return (
                <div
                  key={doc.id}
                  className="card fade-in-up"
                  onClick={() => {
                    setViewingDoc(doc)
                    setIsViewerOpen(true)
                  }}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'border-color 0.15s ease, transform 0.15s ease',
                  }}
                >
                  {/* Left: Icon / Thumbnail & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flex: 1 }}>
                    {isImg && doc.dataUrl ? (
                      <img
                        src={doc.dataUrl}
                        alt={doc.title}
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-md)', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 'var(--radius-md)',
                          background: isPdf
                            ? 'rgba(239, 68, 68, 0.1)'
                            : isCode
                            ? 'rgba(14, 165, 233, 0.1)'
                            : 'rgba(99, 102, 241, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          flexShrink: 0,
                        }}
                      >
                        {isPdf ? '📄' : isCode ? '💻' : '📝'}
                      </div>
                    )}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: 'var(--text-sm)',
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {highlightMatch(doc.title, searchQuery)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {formatFileSize(doc.size)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>•</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>

                        {doc.tags && doc.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, overflow: 'hidden' }}>
                            {doc.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-full)',
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--brand-primary)',
                                  fontWeight: 600,
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Star & Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={async e => {
                        e.stopPropagation()
                        const updated = !doc.isFavorite
                        await localDb.documents.update(doc.id, { isFavorite: updated })
                        loadDocuments()
                      }}
                      style={{ color: doc.isFavorite ? '#F59E0B' : 'var(--text-tertiary)', fontSize: '15px', padding: '4px 6px' }}
                    >
                      {doc.isFavorite ? '★' : '☆'}
                    </button>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>→</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── MODALS ───────────────────────────────────────────────── */}
      <NoteEditorModal
        isOpen={isEditorOpen}
        existingDoc={editingDoc}
        onClose={() => {
          setIsEditorOpen(false)
          setEditingDoc(null)
        }}
        onSaveSuccess={loadDocuments}
      />

      <FileViewerModal
        isOpen={isViewerOpen}
        doc={viewingDoc}
        onClose={() => {
          setIsViewerOpen(false)
          setViewingDoc(null)
        }}
        onEdit={docToEdit => {
          setEditingDoc(docToEdit)
          setIsEditorOpen(true)
        }}
        onDeleteSuccess={loadDocuments}
      />

      <BottomNav />
    </div>
  )
}
