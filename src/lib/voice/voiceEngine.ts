'use client'

/**
 * Srushti Native Voice Engine
 * Uses Android Web Speech Recognition for Speech-to-Text
 * and native SpeechSynthesis for spoken Voice Replies (100% Free)
 */

export class VoiceEngine {
  private recognition: any = null
  private isListening: boolean = false
  private synth: SpeechSynthesis | null = null
  private selectedVoice: SpeechSynthesisVoice | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Initialize Speech-to-Text Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.recognition.continuous = false
        this.recognition.interimResults = true
        this.recognition.lang = 'en-IN' // Supports English with Indian accent / Hinglish
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
    // Prioritize natural English (India / US / UK)
    this.selectedVoice =
      voices.find(v => v.lang === 'en-IN') ||
      voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0] ||
      null
  }

  public isSpeechSupported(): boolean {
    return Boolean(this.recognition)
  }

  public isTtsSupported(): boolean {
    return Boolean(this.synth)
  }

  /**
   * Starts listening to user speech and returns interim and final transcripts
   */
  public startListening(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError('Speech recognition is not supported on this browser/device.')
      return
    }

    if (this.isListening) {
      this.stopListening()
    }

    let finalTranscript = ''

    this.recognition.onstart = () => {
      this.isListening = true
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
      this.isListening = false
      onError(event.error || 'Voice recognition error')
    }

    this.recognition.onend = () => {
      this.isListening = false
      onEnd()
    }

    try {
      this.recognition.start()
    } catch (e: any) {
      this.isListening = false
      onError(e.message || 'Failed to start voice recognition')
    }
  }

  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.abort()
      } catch {}
      try {
        this.recognition.stop()
      } catch {}
      this.isListening = false
    }
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
