'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

export default function AndroidGestureBack() {
  const router = useRouter()
  const pathname = usePathname()
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const isSwipingRef = useRef(false)

  // 1. Android Native Hardware & Gesture Back Button Listener
  useEffect(() => {
    let backListener: any = null

    const setupNativeBack = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { App: CapApp } = await import('@capacitor/app')
          backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
            // Check if any open overlay, sheet, or popup exists on screen
            const openOverlay = document.querySelector(
              '.sheet-overlay, .theme-popup, [data-modal="true"]'
            ) as HTMLElement | null

            if (openOverlay) {
              openOverlay.click()
              return
            }

            // If not on home, go back one step
            if (pathname && pathname !== '/') {
              router.back()
            } else {
              // On home page, minimize or exit app
              CapApp.exitApp()
            }
          })
        } catch (e) {
          console.warn('Native back listener error:', e)
        }
      }
    }

    setupNativeBack()

    return () => {
      if (backListener?.remove) {
        backListener.remove()
      }
    }
  }, [pathname, router])

  // 2. Global Edge Swipe-to-Go-Back Gesture (Works on Android Webview & Mobile Browsers)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return

      // Only trigger if touch starts near the left edge (<= 45px)
      if (touch.clientX <= 45) {
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        }
        isSwipingRef.current = true
      } else {
        touchStartRef.current = null
        isSwipingRef.current = false
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipingRef.current || !touchStartRef.current) return
      const touch = e.touches[0]
      if (!touch) return

      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

      // If user is scrolling vertically more than horizontally, cancel swipe back
      if (deltaY > 60 && deltaX < 30) {
        isSwipingRef.current = false
        touchStartRef.current = null
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwipingRef.current || !touchStartRef.current) return

      const touch = e.changedTouches[0]
      if (!touch) return

      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
      const duration = Date.now() - touchStartRef.current.time

      // Valid horizontal swipe: swiped right >= 70px, vertical deviation < 80px, quick gesture
      if (deltaX >= 70 && deltaY < 80 && duration < 600) {
        // If an overlay/modal is open, close it first
        const openOverlay = document.querySelector(
          '.sheet-overlay, .theme-popup, [data-modal="true"]'
        ) as HTMLElement | null

        if (openOverlay) {
          openOverlay.click()
        } else if (pathname && pathname !== '/') {
          router.back()
        }
      }

      touchStartRef.current = null
      isSwipingRef.current = false
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pathname, router])

  return null
}
