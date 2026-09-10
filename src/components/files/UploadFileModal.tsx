'use client'

import { useState, useEffect, useRef } from 'react'
import { LocalDocument, localDb } from '@/lib/db/localDb'

interface UploadFileModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editingDoc?: LocalDocument | null
  initialFile?: File | null
}

const QUICK_TAG_SUGGESTIONS = ['exam', 'study', 'work', 'important', 'finance', 'project', 'personal']

export default function UploadFileModal({
  isOpen,
  onClose,
  onSuccess,
  editingDoc,
  initialFile,
}: UploadFileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileDataUrl, setFileDataUrl] = useState<string>('')
  const [fileTextContent, setFileTextContent] = useState<string>('')

  const [customName, setCustomName] = useState('')
  const [category, setCategory] = useState<string>('pdf')
  const [tagsInput, setTagsInput] = useState('')
  const [notes, setNotes] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  // Initialize or reset
  useEffect(() => {
    if (editingDoc) {
      setCustomName(editingDoc.title || '')
      setCategory(editingDoc.type || 'other')
      setTagsInput(editingDoc.tags ? editingDoc.tags.join(', ') : '')
      setNotes(editingDoc.notes || '')
      setIsFavorite(!!editingDoc.isFavorite)
      setIsPinned(!!editingDoc.pinned)
      setFileDataUrl(editingDoc.dataUrl || '')
      setFileTextContent(editingDoc.content || '')
      setSelectedFile(null)
    } else if (initialFile) {
      processSelectedFile(initialFile)
    } else {
      resetForm()
    }
  }, [editingDoc, initialFile, isOpen])

  const resetForm = () => {
    setSelectedFile(null)
    setFileDataUrl('')
    setFileTextContent('')
    setCustomName('')
    setCategory('pdf')
    setTagsInput('')
    setNotes('')
    setIsFavorite(false)
    setIsPinned(false)
  }

  const processSelectedFile = (file: File) => {
    setSelectedFile(file)
    // Clean default title: remove file extension for easy editing
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
    setCustomName(cleanTitle)

    // Detect type
    let docType = 'other'
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
      file.name.endsWith('.css') ||
      file.name.endsWith('.sql')
    ) {
      docType = 'code'
    } else if (
      file.name.endsWith('.doc') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.rtf')
    ) {
      docType = 'doc'
    } else if (
      file.name.endsWith('.xls') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.csv')
    ) {
      docType = 'sheet'
    }
    setCategory(docType)

    // Read content based on type
    if (docType === 'image' || docType === 'pdf') {
      const reader = new FileReader()
      reader.onload = () => {
        setFileDataUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        setFileTextContent(reader.result as string)
      }
      reader.readAsText(file)
    }
  }

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      processSelectedFile(files[0])
    }
  }

  const handleToggleTag = (tag: string) => {
    const existing = tagsInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean)

    if (existing.includes(tag)) {
      setTagsInput(existing.filter(t => t !== tag).join(', '))
    } else {
      setTagsInput([...existing, tag].join(', '))
    }
  }

  const handleSave = async () => {
    if (!customName.trim()) return
    if (!editingDoc && !selectedFile && !fileDataUrl && !fileTextContent) return

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean)

      const docId = editingDoc?.id || `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      const docToSave: LocalDocument = {
        id: docId,
        title: customName.trim(),
        type: category,
        mimeType: selectedFile?.type || editingDoc?.mimeType || 'application/octet-stream',
        size: selectedFile?.size || editingDoc?.size || 0,
        dataUrl: fileDataUrl || editingDoc?.dataUrl,
        content: fileTextContent || editingDoc?.content,
        tags: parsedTags,
        notes: notes.trim(),
        isFavorite,
        pinned: isPinned,
        createdAt: editingDoc?.createdAt || now,
        updatedAt: now,
      }

      await localDb.documents.put(docToSave)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to save document:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const currentSize = selectedFile?.size || editingDoc?.size
  const originalFileName = selectedFile?.name || editingDoc?.title

  return (
    <div
      className="sheet-overlay"
      style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          padding: 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 22 }}>📁</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                {editingDoc ? 'Edit File Info' : 'Upload File to Vault'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 1 }}>
                Name and tag your file for instant letter-speed search
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ padding: '4px 8px', fontSize: 'var(--text-lg)' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* File Selector Dropzone (if not editing and no file selected) */}
          {!editingDoc && !selectedFile && (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6) var(--space-4)',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-base)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>📎</div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--brand-primary)' }}>
                Tap to Select File from Device
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: 4 }}>
                Supports PDFs, Images, Documents, Code, Spreadsheets
              </div>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFilePicked}
          />

          {/* Selected File Banner */}
          {(selectedFile || editingDoc) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {category === 'image' ? '🖼️' : category === 'pdf' ? '📄' : category === 'code' ? '💻' : '📑'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {originalFileName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {formatFileSize(currentSize)} · Ready for vault
                </div>
              </div>

              {!editingDoc && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--brand-primary)' }}
                >
                  Change
                </button>
              )}
            </div>
          )}

          {/* 1. Custom File Name (CRITICAL FOR SEARCH) */}
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" style={{ fontWeight: 700 }}>
                File Search Name <span style={{ color: 'var(--brand-danger)' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                Fast Search Target
              </span>
            </div>
            <input
              type="text"
              className="input"
              placeholder="e.g. Physics Semester 4 Syllabus, Math Formula Sheet"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              autoFocus
              style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 3 }}>
              Give this document a recognizable name so typing any letter in FastVault finds it instantly.
            </div>
          </div>

          {/* 2. File Category */}
          <div className="input-group">
            <label className="input-label" style={{ fontWeight: 600 }}>File Category</label>
            <select
              className="input"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="pdf">📄 PDF Document</option>
              <option value="image">🖼️ Image / Photo / Diagram</option>
              <option value="doc">📑 Word / Text Document</option>
              <option value="code">💻 Code / Script / JSON</option>
              <option value="sheet">📊 Spreadsheet / CSV</option>
              <option value="other">📁 Other File</option>
            </select>
          </div>

          {/* 3. Search Keywords / Tags */}
          <div className="input-group">
            <label className="input-label" style={{ fontWeight: 600 }}>
              Search Tags & Keywords
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. exam, semester, syllabus, unit1"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
            />

            {/* Clickable Quick Tag Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {QUICK_TAG_SUGGESTIONS.map(tag => {
                const isSelected = tagsInput.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: isSelected ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    #{tag}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. Notes / Description (Optional) */}
          <div className="input-group">
            <label className="input-label" style={{ fontWeight: 600 }}>
              File Notes / Summary (Optional)
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Important formulas on page 4; midterm topics covered."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ resize: 'vertical', fontSize: '13px' }}
            />
          </div>

          {/* 5. Toggles: Star & Pin */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', paddingTop: 'var(--space-1)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={e => setIsFavorite(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#F59E0B' }}
              />
              <span>⭐ Mark as Favorite</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--brand-primary)' }}
              />
              <span>📌 Pin to Top</span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
            background: 'var(--bg-subtle)',
          }}
        >
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={!customName.trim() || (!editingDoc && !selectedFile) || saving}
          >
            {saving ? 'Saving...' : editingDoc ? 'Update File Info' : 'Save to FastVault'}
          </button>
        </div>
      </div>
    </div>
  )
}
