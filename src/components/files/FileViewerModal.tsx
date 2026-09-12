'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LocalDocument, localDb } from '@/lib/db/localDb'

interface FileViewerModalProps {
  doc: LocalDocument | null
  isOpen: boolean
  onClose: () => void
  onEdit: (doc: LocalDocument) => void
  onDeleteSuccess?: () => void
}

export default function FileViewerModal({
  doc,
  isOpen,
  onClose,
  onEdit,
  onDeleteSuccess,
}: FileViewerModalProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isPdf = doc ? (doc.type === 'pdf' || (doc.mimeType && doc.mimeType.includes('pdf'))) : false

  // Generate safe Blob URL for PDF rendering
  const pdfBlobUrl = useMemo(() => {
    if (!doc || !isPdf || !doc.dataUrl) return null
    try {
      const parts = doc.dataUrl.split(',')
      const base64 = parts[1] || parts[0]
      const byteCharacters = atob(base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      return URL.createObjectURL(blob)
    } catch (e) {
      console.error('Error generating PDF blob URL:', e)
      return doc.dataUrl
    }
  }, [doc, isPdf])

  useEffect(() => {
    return () => {
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfBlobUrl)
      }
    }
  }, [pdfBlobUrl])

  if (!isOpen || !doc) return null

  const handleCopyContent = async () => {
    if (!doc.content) return
    try {
      await navigator.clipboard.writeText(doc.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleAskNexra = () => {
    const textSnippet = doc.content ? doc.content.slice(0, 1500) : ''
    const prefillPrompt = `Regarding my saved file "${doc.title}"${textSnippet ? ` with content:\n"""\n${textSnippet}\n"""` : ''}:\nPlease analyze and summarize this document for me.`
    
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('srushti_prefill', prefillPrompt)
    }
    onClose()
    router.push('/chat')
  }

  const handleOpenPdfExternal = () => {
    const targetUrl = pdfBlobUrl || doc.dataUrl
    if (targetUrl) {
      window.open(targetUrl, '_blank')
    }
  }

  const handleDownload = () => {
    try {
      const href = pdfBlobUrl || doc.dataUrl
      if (href) {
        const a = document.createElement('a')
        a.href = href
        a.download = doc.title.toLowerCase().endsWith('.pdf') ? doc.title : `${doc.title}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else if (doc.content) {
        const blob = new Blob([doc.content], { type: doc.mimeType || 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${doc.title.replace(/\s+/g, '_')}.${doc.type === 'code' ? 'txt' : 'md'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Download failed', e)
    }
  }

  const handleToggleStar = async () => {
    const updated = !doc.isFavorite
    await localDb.documents.update(doc.id, { isFavorite: updated })
    doc.isFavorite = updated
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('srushti_data_changed'))
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${doc.title}" from FastVault?`)) return
    setDeleting(true)
    try {
      await localDb.documents.delete(doc.id)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('srushti_data_changed'))
      }
      if (onDeleteSuccess) onDeleteSuccess()
      onClose()
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeleting(false)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isImage = doc.type === 'image' || (doc.mimeType && doc.mimeType.startsWith('image/'))
  const isCode = doc.type === 'code'

  return (
    <div className="sheet-overlay" style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }} onClick={onClose}>
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
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
            background: 'var(--bg-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>
              {isImage ? '🖼️' : isPdf ? '📄' : isCode ? '💻' : '📝'}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 'var(--text-base)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--text-primary)',
                }}
              >
                {doc.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {doc.type.toUpperCase()} · {formatFileSize(doc.size) || 'Local Vault'} · {new Date(doc.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleToggleStar}
              style={{ color: doc.isFavorite ? '#F59E0B' : 'var(--text-tertiary)', fontSize: 'var(--text-base)', padding: '6px' }}
              title={doc.isFavorite ? 'Remove star' : 'Star document'}
            >
              {doc.isFavorite ? '★' : '☆'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ padding: '6px 10px', fontSize: 'var(--text-lg)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', flex: 1 }}>
          {/* Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-4)' }}>
              {doc.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--brand-primary)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* File Notes / Summary */}
          {doc.notes && (
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                marginBottom: 'var(--space-4)',
                borderLeft: '3px solid var(--brand-primary)',
              }}
            >
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>Summary / Notes:</strong>
              {doc.notes}
            </div>
          )}

          {/* Image Display */}
          {isImage && doc.dataUrl && (
            <div style={{ textAlign: 'center', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <img
                src={doc.dataUrl}
                alt={doc.title}
                style={{ maxWidth: '100%', maxHeight: 380, objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
              />
            </div>
          )}

          {/* PDF Viewer & In-App Embedded Frame */}
          {isPdf && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              {/* PDF Action Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📑</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      PDF Reader
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {formatFileSize(doc.size) || 'Document'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleOpenPdfExternal}
                    style={{ fontSize: '11.5px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 8 }}
                    title="Open in full screen or external viewer"
                  >
                    <span>🚀</span> Fullscreen
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleDownload}
                    style={{ fontSize: '11.5px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 8 }}
                    title="Save PDF"
                  >
                    <span>⬇️</span> Download
                  </button>
                </div>
              </div>

              {/* In-App Embedded Frame */}
              {pdfBlobUrl ? (
                <div
                  style={{
                    width: '100%',
                    height: '480px',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-default)',
                    background: '#334155',
                    position: 'relative',
                  }}
                >
                  <iframe
                    src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title={doc.title}
                  />
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-6)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 44, marginBottom: 8 }}>📑</div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                    {doc.title}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    PDF Document · {formatFileSize(doc.size)}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenPdfExternal}
                    style={{ marginTop: 'var(--space-4)' }}
                  >
                    🚀 Open PDF Document
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Text / Markdown / Code Content */}
          {doc.content ? (
            <div
              style={{
                background: isCode ? '#0F172A' : 'var(--bg-subtle)',
                color: isCode ? '#E2E8F0' : 'var(--text-primary)',
                fontFamily: isCode ? 'monospace' : 'inherit',
                fontSize: '13px',
                lineHeight: 1.65,
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {doc.content}
            </div>
          ) : (
            !isImage && !isPdf && (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-6)' }}>
                No textual preview available for this file.
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            background: 'var(--bg-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAskNexra}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>🤖</span>
              <span>Ask Nexra</span>
            </button>

            {doc.content && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyContent}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            )}

            {(doc.dataUrl || doc.content) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDownload}
              >
                Export
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onClose()
                onEdit(doc)
              }}
            >
              ✏️ Edit Info
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: '#EF4444' }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : '🗑️ Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
