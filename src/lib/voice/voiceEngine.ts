'use client'

import { localDb } from '@/lib/db/localDb'

const DEFAULT_GEMINI_KEY =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyDNGuHpusNz7fgyOAOeLk45T3f4CjL0iaQ'

async function getGeminiApiKey(): Promise<string> {
  try {
    const pref = await localDb.preferences.get('gemini_api_key')
    if (pref?.value) return pref.value
  } catch {}
  if (typeof localStorage !== 'undefined') {
    const key = localStorage.getItem('srushti_gemini_api_key')
    if (key) return key
  }
  return DEFAULT_GEMINI_KEY
}

/**
 * Srushti Native Voice Engine
 * Supports dual-engine speech recognition:
 * 1. Web Speech API (Chrome / Web fast path)
 * 2. MediaRecorder + Gemini Multimodal Audio Transcriber (100% Android APK / WebView Compatible)
 * plus native SpeechSynthesis for spoken voice replies.
 */
export class VoiceEngine {
  private recognition: any = null
  private isListening: boolean = false
  private synth: SpeechSynthesis | null = null
  private selectedVoice: SpeechSynthesisVoice | null = null

  // MediaRecorder engine for Android APK / WebViews
  private mediaRecorder: MediaRecorder | null = null
  private audioStream: MediaStream | null = null
  private audioChunks: Blob[] = []
  private activeMode: 'speech-api' | 'media-recorder' | null = null
  private recorderTimer: any = null

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Initialize Web Speech Recognition if available
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition()
          this.recognition.continuous = false
          this.recognition.interimResults = true
          this.recognition.lang = 'en-IN'
        } catch {
          this.recognition = null
        }
      }

      // 2. Initialize Text-to-Speech Synthesizer
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis
        this.loadVoices()
        if (speechSynthesis.onvoiceschanged !== undefined) {
          speechSynthesis.onvoiceschanged = () => this.loadVoices()
        }
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return
    const voices = this.synth.getVoices()
    this.selectedVoice =
      voices.find(v => v.lang === 'en-IN') ||
      voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0] ||
      null
  }

  public isSpeechSupported(): boolean {
    if (typeof window === 'undefined') return false
    return Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (navigator?.mediaDevices && navigator?.mediaDevices?.getUserMedia)
    )
  }

  public isTtsSupported(): boolean {
    return Boolean(this.synth)
  }

  /**
   * Starts listening to user speech.
   * Uses Web SpeechRecognition if available, or automatically falls back to MediaRecorder + Gemini.
   */
  public async startListening(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ) {
    if (this.isListening) {
      this.stopListening()
      return
    }

    // Try Web SpeechRecognition first if available
    if (this.recognition) {
      try {
        let finalTranscript = ''

        this.recognition.onstart = () => {
          this.isListening = true
          this.activeMode = 'speech-api'
          onInterim('🎙️ Listening... (Speak now)')
        }

        this.recognition.onresult = (event: any) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interim += transcript
            }
          }
          if (interim) onInterim(interim)
          if (finalTranscript) onFinal(finalTranscript)
        }

        this.recognition.onerror = (event: any) => {
          const err = event.error || ''
          // If Web Speech is blocked or unsupported in WebView, seamlessly fall back to MediaRecorder!
          if (err === 'service-not-allowed' || err === 'not-allowed' || err === 'audio-capture' || err === 'network') {
            console.warn('SpeechRecognition failed, switching to MediaRecorder fallback:', err)
            this.recognition = null
            this.startMediaRecorder(onInterim, onFinal, onError, onEnd)
            return
          }
          this.isListening = false
          this.activeMode = null
          onError(err || 'Voice recognition error')
        }

        this.recognition.onend = () => {
          this.isListening = false
          this.activeMode = null
          onEnd()
        }

        this.recognition.start()
        return
      } catch (e) {
        console.warn('Failed to start SpeechRecognition, falling back to MediaRecorder:', e)
        this.recognition = null
      }
    }

    // Android APK / WebView Fallback: MediaRecorder with Gemini AI Transcription
    await this.startMediaRecorder(onInterim, onFinal, onError, onEnd)
  }

  private async startMediaRecorder(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onError('Audio recording is not supported on this device.')
      onEnd()
      return
    }

    try {
      this.audioChunks = []
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Determine supported mime type for audio recording
      let mimeType = 'audio/webm'
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus'
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac'
        }
      }

      this.mediaRecorder = new MediaRecorder(this.audioStream, mimeType ? { mimeType } : undefined)
      this.activeMode = 'media-recorder'
      this.isListening = true

      onInterim('🎙️ Listening... (Tap mic when done speaking)')

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.onstop = async () => {
        this.isListening = false
        this.activeMode = null
        if (this.recorderTimer) {
          clearTimeout(this.recorderTimer)
          this.recorderTimer = null
        }

        // Clean up stream tracks
        if (this.audioStream) {
          this.audioStream.getTracks().forEach(track => track.stop())
          this.audioStream = null
        }

        if (this.audioChunks.length === 0) {
          onEnd()
          return
        }

        onInterim('Transcribing speech... ⚡')

        try {
          const audioBlob = new Blob(this.audioChunks, { type: mimeType })
          const apiKey = await getGeminiApiKey()
          if (!apiKey) {
            onError('Gemini API key is missing. Please add your key in Settings.')
            onEnd()
            return
          }

          const transcribedText = await this.transcribeAudioWithGemini(audioBlob, apiKey)
          if (transcribedText) {
            onFinal(transcribedText)
          } else {
            onError('No speech detected. Please speak louder and try again.')
          }
        } catch (err: any) {
          console.error('Audio transcription error:', err)
          onError(err.message || 'Failed to transcribe audio')
        } finally {
          onEnd()
        }
      }

      this.mediaRecorder.start(250) // Collect chunks every 250ms

      // Safety timeout: automatically stop recording after 30 seconds
      this.recorderTimer = setTimeout(() => {
        if (this.isListening && this.activeMode === 'media-recorder') {
          this.stopListening()
        }
      }, 30000)
    } catch (err: any) {
      this.isListening = false
      this.activeMode = null
      console.error('Microphone error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        onError('Microphone permission was denied. Please allow microphone access in your phone settings.')
      } else {
        onError(err.message || 'Could not access microphone.')
      }
      onEnd()
    }
  }

  public stopListening() {
    if (this.activeMode === 'speech-api' && this.recognition) {
      try {
        this.recognition.abort()
      } catch {}
      try {
        this.recognition.stop()
      } catch {}
      this.isListening = false
      this.activeMode = null
    } else if (this.activeMode === 'media-recorder' && this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop()
        } catch {}
      }
      if (this.recorderTimer) {
        clearTimeout(this.recorderTimer)
        this.recorderTimer = null
      }
    } else {
      this.isListening = false
      this.activeMode = null
    }
  }

  /**
   * Transcribe recorded audio blob using Google Gemini Multimodal Audio model
   */
  private async transcribeAudioWithGemini(audioBlob: Blob, apiKey: string): Promise<string> {
    const arrayBuffer = await audioBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64Data = btoa(binary)

    const rawMime = audioBlob.type.split(';')[0] || 'audio/webm'

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: rawMime,
                data: base64Data,
              },
            },
            {
              text: "Transcribe the user's spoken voice audio verbatim into text. Output ONLY the exact transcribed text, without any quotes, brackets, commentary, or markdown. If in Hindi or Hinglish, transcribe it naturally as spoken. If silent or unintelligible, output nothing.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 300,
      },
    }

    // Try Gemini 2.0 Flash first (fastest multimodal)
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      // Fallback to gemini-1.5-flash
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      throw new Error(errJson?.error?.message || `Voice transcription failed (${response.status})`)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    return text
  }

  /**
   * Speaks the given text using Android's native Google TTS voice engine
   */
  public speak(text: string, onEnd?: () => void) {
    if (!this.synth) return

    // Cancel any ongoing speech
    try {
      this.synth.cancel()
    } catch {}

    // Clean markdown tags & symbols before speaking
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // code blocks
      .replace(/[#*`_~[\]()]/g, '') // markdown symbols
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice
    }
    utterance.rate = 1.05 // Slightly energetic pace
    utterance.pitch = 1.0

    utterance.onend = () => {
      if (onEnd) onEnd()
    }

    utterance.onerror = () => {
      if (onEnd) onEnd()
    }

    try {
      this.synth.speak(utterance)
    } catch (e) {
      console.warn('TTS error:', e)
      if (onEnd) onEnd()
    }
  }

  public stopSpeaking() {
    if (this.synth) {
      try {
        this.synth.cancel()
      } catch {}
    }
  }
}

export const voiceEngine = new VoiceEngine()

