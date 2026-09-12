'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LocalDocument, localDb } from '@/lib/db/localDb'
import { openPdfWithDefaultViewer } from '@/lib/pdf/pdfViewer'
import { Capacitor } from '@capacitor/core'

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
  const [isOpeningPdf, setIsOpeningPdf] = useState(false)

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

  const handleOpenPdfExternal = async () => {
    if (!doc) return
    setIsOpeningPdf(true)
    try {
      const res = await openPdfWithDefaultViewer({
        dataUrl: doc.dataUrl,
        content: doc.content,
        notes: doc.notes,
        title: doc.title,
      })
      if (!res.success && res.error) {
        alert(res.error)
      }
    } catch (err: any) {
      console.error('Error launching PDF viewer:', err)
      alert('Could not open default PDF viewer. Please check that Google Drive or a PDF reader is installed.')
    } finally {
      setIsOpeningPdf(false)
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

          {/* PDF Viewer & Drive / Default Viewer Launcher */}
          {isPdf && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              {/* Dedicated Drive PDF Viewer Action Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(245, 158, 11, 0.08))',
                  border: '1.5px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#EF4444',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                        flexShrink: 0,
                      }}
                    >
                      📄
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        PDF Document · {formatFileSize(doc.size) || 'Ready'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: 'rgba(34, 197, 94, 0.12)',
                      color: '#16A34A',
                      padding: '3px 9px',
                      borderRadius: 8,
                      fontSize: '10.5px',
                      fontWeight: 700,
                    }}
                  >
                    <span>⚡</span> Drive / System PDF Viewer
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleOpenPdfExternal}
                    disabled={isOpeningPdf}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                      color: '#FFFFFF',
                      padding: '12px 18px',
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: isOpeningPdf ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <span>{isOpeningPdf ? '⏳' : '🚀'}</span>
                    <span>{isOpeningPdf ? 'Opening in PDF Viewer...' : 'Open in Drive PDF Viewer'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDownload}
                    style={{ fontSize: '12px', padding: '11px 16px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Download PDF file"
                  >
                    <span>⬇️</span> Download
                  </button>
                </div>
              </div>

              {/* In-App Desktop Preview Frame (only if browser environment and blob available) */}
              {!Capacitor.isNativePlatform() && pdfBlobUrl && (
                <div
                  style={{
                    width: '100%',
                    height: '460px',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-default)',
                    background: '#334155',
                    position: 'relative',
                    marginTop: 8,
                  }}
                >
                  <iframe
                    src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title={doc.title}
                  />
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
