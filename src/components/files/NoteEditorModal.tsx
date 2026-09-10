'use client'

import { useState, useEffect } from 'react'
import { LocalDocument, localDb } from '@/lib/db/localDb'

interface NoteEditorModalProps {
  isOpen: boolean
  onClose: () => void
  existingDoc?: LocalDocument | null
  onSaveSuccess?: () => void
}

export default function NoteEditorModal({
  isOpen,
  onClose,
  existingDoc,
  onSaveSuccess,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'note' | 'code' | 'other'>('note')
  const [tagsInput, setTagsInput] = useState('')
  const [content, setContent] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existingDoc) {
      setTitle(existingDoc.title || '')
      setCategory(existingDoc.type === 'code' ? 'code' : 'note')
      setTagsInput(existingDoc.tags ? existingDoc.tags.join(', ') : '')
      setContent(existingDoc.content || '')
      setIsFavorite(!!existingDoc.isFavorite)
    } else {
      setTitle('')
      setCategory('note')
      setTagsInput('')
      setContent('')
      setIsFavorite(false)
    }
  }, [existingDoc, isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    try {
      const now = new Date().toISOString()
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean)

      const docId = existingDoc?.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      const docToSave: LocalDocument = {
        id: docId,
        title: title.trim(),
        type: category,
        mimeType: category === 'code' ? 'text/plain' : 'text/markdown',
        size: new Blob([content]).size,
        content: content,
        tags: parsedTags,
        isFavorite,
        createdAt: existingDoc?.createdAt || now,
        updatedAt: now,
      }

      await localDb.documents.put(docToSave)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }

      if (onSaveSuccess) onSaveSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save document:', err)
    } finally {
      setSaving(false)
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <div className="sheet-overlay" style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          padding: 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 20 }}>{category === 'code' ? '💻' : '📝'}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)' }}>
              {existingDoc ? 'Edit Document' : 'New Note / Snippet'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setIsFavorite(!isFavorite)}
              style={{ color: isFavorite ? '#F59E0B' : 'var(--text-tertiary)', fontSize: 'var(--text-sm)', padding: '4px 8px' }}
              title={isFavorite ? 'Starred' : 'Star document'}
            >
              {isFavorite ? '★ Starred' : '☆ Star'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ padding: '4px 8px', fontSize: 'var(--text-lg)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Title input */}
          <div className="input-group">
            <label className="input-label" style={{ fontWeight: 600 }}>Title</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Physics Formula Sheet, Math Summary, API Specs..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Type & Tags row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Format</label>
              <select
                className="input"
                value={category}
                onChange={e => setCategory(e.target.value as any)}
              >
                <option value="note">📝 Note / Markdown</option>
                <option value="code">💻 Code Snippet</option>
                <option value="other">📑 General Doc</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Tags (comma separated)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. exam, chemistry, formula"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
              />
            </div>
          </div>

          {/* Content area */}
          <div className="input-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="input-label" style={{ fontWeight: 600 }}>Content</label>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{wordCount} words</span>
            </div>
            <textarea
              className="input"
              rows={12}
              style={{
                fontFamily: category === 'code' ? 'monospace' : 'inherit',
                fontSize: '13px',
                lineHeight: 1.6,
                resize: 'vertical',
                minHeight: 220,
              }}
              placeholder={category === 'code' ? '// Paste or write code snippet here...\nfunction example() {\n  return true\n}' : '# Introduction\n\nWrite your notes or markdown here...\n- Key point 1\n- Key point 2'}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
            background: 'var(--bg-secondary)',
          }}
        >
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!title.trim() || saving}
          >
            {saving ? 'Saving...' : existingDoc ? 'Update Document' : 'Save to Vault'}
          </button>
        </div>
      </div>
    </div>
  )
}
