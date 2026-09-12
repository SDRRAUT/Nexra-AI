import { registerPlugin, Capacitor } from '@capacitor/core'

export interface PdfOpenerPlugin {
  openPdf(options: { base64: string; filename?: string }): Promise<{ success: boolean; path?: string }>
}

export const PdfOpener = registerPlugin<PdfOpenerPlugin>('PdfOpener')

/**
 * Generate a valid, lightweight PDF binary in base64 if a document lacks raw file bytes
 */
export function generateSimplePdfBase64(title: string, content?: string, notes?: string): string {
  const cleanTitle = (title || 'Document').replace(/[^\x20-\x7E]/g, '')
  const bodyText = (notes || content || 'Nexra Saved Document')
  const cleanBody = bodyText.replace(/[^\x20-\x7E\n]/g, '').slice(0, 1500)
  const lines = cleanBody.split('\n').filter(Boolean)

  let textStream = `BT /F1 18 Tf 50 740 Td (${cleanTitle.slice(0, 40)}) Tj ET\n`
  textStream += `BT /F1 10 Tf 50 715 Td (Created with Nexra OS - FastVault) Tj ET\n`
  let y = 675
  for (const line of lines.slice(0, 32)) {
    const safeLine = line.replace(/[\(\)\\]/g, '').slice(0, 80)
    textStream += `BT /F1 11 Tf 50 ${y} Td (${safeLine}) Tj ET\n`
    y -= 18
  }

  const streamLen = textStream.length
  const pdfString = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${streamLen} >>
stream
${textStream}
endstream
endobj
xref
0 6
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000300 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
${400 + streamLen}
%%EOF`

  if (typeof btoa !== 'undefined') {
    return btoa(pdfString)
  }
  return Buffer.from(pdfString).toString('base64')
}

/**
 * Open a PDF with the user's default PDF viewer (Google Drive PDF Viewer, system app, or browser)
 */
export async function openPdfWithDefaultViewer(options: {
  dataUrl?: string
  content?: string
  notes?: string
  title: string
}): Promise<{ success: boolean; error?: string }> {
  const { dataUrl, content, notes, title } = options
  const filename = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`

  // Ensure we have a valid base64 payload
  let base64 = dataUrl || ''
  if (!base64 || base64.length < 50) {
    base64 = generateSimplePdfBase64(title, content, notes)
  }

  try {
    // 1. If running inside native Android / Capacitor APK
    if (Capacitor.isNativePlatform()) {
      const res = await PdfOpener.openPdf({
        base64,
        filename,
      })
      return { success: !!res.success }
    }

    // 2. If running on Web / Browser
    try {
      let rawBase64 = base64
      if (rawBase64.includes(',')) {
        rawBase64 = rawBase64.substring(rawBase64.indexOf(',') + 1)
      }
      rawBase64 = rawBase64.replace(/\s+/g, '')

      const byteCharacters = atob(rawBase64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(blob)

      // Open using a synthetic link
      const a = document.createElement('a')
      a.href = blobUrl
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
      return { success: true }
    } catch (e: any) {
      if (base64.startsWith('data:')) {
        window.open(base64, '_blank')
        return { success: true }
      }
      throw e
    }
  } catch (err: any) {
    console.error('Error opening PDF with default viewer:', err)
    return { success: false, error: err.message || 'Failed to open PDF' }
  }
}
