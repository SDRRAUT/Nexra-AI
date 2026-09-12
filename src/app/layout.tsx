import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nexra AI — The Next Layer of Your Life',
  description: 'Nexra AI — The next layer of your life. Your intelligent autonomous personal AI assistant that manages your schedule, focus flow, and holistic balance.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nexra AI',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#5B6BF0',
}

import AndroidGestureBack from '@/components/layout/AndroidGestureBack'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AndroidGestureBack />
        {children}
      </body>
    </html>
  )
}
