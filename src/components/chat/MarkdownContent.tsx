'use client'

import React from 'react'

interface MarkdownContentProps {
  content: string
  isStreaming?: boolean
}

/**
 * Parses and renders markdown text into clean, beautiful styled React components
 * removing raw symbols like #, **, *, action JSON blocks, etc.
 */
export default function MarkdownContent({ content, isStreaming }: MarkdownContentProps) {
  // 1. Strip out raw action JSON blocks from visual display
  let cleanText = content.replace(/```action\s*[\s\S]*?```/g, '').trim()

  if (!cleanText && isStreaming) {
    return <span className="stream-cursor" />
  }

  // 2. Parse lines into structured blocks
  const lines = cleanText.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} style={{ paddingLeft: 20, margin: '6px 0', lineHeight: 1.6 }}>
            {listItems.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {formatInline(item)}
              </li>
            ))}
          </ol>
        )
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} style={{ paddingLeft: 20, margin: '6px 0', lineHeight: 1.6, listStyleType: 'disc' }}>
            {listItems.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {formatInline(item)}
              </li>
            ))}
          </ul>
        )
      }
      listItems = []
      listType = null
    }
  }

  // Parse inline bold (**bold**), italic (*italic*), code (`code`)
  function formatInline(text: string): React.ReactNode {
    // Regex for bold (**text** or __text__), code (`code`), and italic (*text*)
    const parts: React.ReactNode[] = []
    const regex = /(\*\*|__)(.*?)\1|(`)(.*?)\3|(\*|_)(.*?)\5/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }

      if (match[2]) {
        // Bold
        parts.push(
          <strong key={match.index} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {match[2]}
          </strong>
        )
      } else if (match[4]) {
        // Code
        parts.push(
          <code
            key={match.index}
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '12.5px',
              background: 'var(--bg-subtle, rgba(0,0,0,0.06))',
              padding: '2px 6px',
              borderRadius: 4,
              color: 'var(--brand-primary)',
            }}
          >
            {match[4]}
          </code>
        )
      } else if (match[6]) {
        // Italic
        parts.push(<em key={match.index}>{match[6]}</em>)
      }

      lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      continue
    }

    // Heading 1 (# Heading)
    if (trimmed.startsWith('# ')) {
      flushList()
      elements.push(
        <div
          key={i}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '17px',
            fontWeight: 800,
            color: 'var(--brand-primary)',
            margin: '10px 0 4px 0',
          }}
        >
          {formatInline(trimmed.replace(/^#\s+/, ''))}
        </div>
      )
      continue
    }

    // Heading 2 (## Heading)
    if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <div
          key={i}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '8px 0 4px 0',
          }}
        >
          {formatInline(trimmed.replace(/^##\s+/, ''))}
        </div>
      )
      continue
    }

    // Heading 3 (### Heading)
    if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <div
          key={i}
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '6px 0 2px 0',
          }}
        >
          {formatInline(trimmed.replace(/^###\s+/, ''))}
        </div>
      )
      continue
    }

    // Bullet List (* item or - item)
    if (/^[-*•]\s+/.test(trimmed)) {
      listType = 'ul'
      listItems.push(trimmed.replace(/^[-*•]\s+/, ''))
      continue
    }

    // Numbered List (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      listType = 'ol'
      listItems.push(trimmed.replace(/^\d+\.\s+/, ''))
      continue
    }

    // Standard Paragraph
    flushList()
    elements.push(
      <p key={i} style={{ margin: '0 0 6px 0', lineHeight: 1.6 }}>
        {formatInline(trimmed)}
      </p>
    )
  }

  flushList()

  return (
    <div className="formatted-markdown" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
      {elements}
      {isStreaming && <span className="stream-cursor" />}
    </div>
  )
}
