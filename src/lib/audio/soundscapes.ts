/**
 * Procedural Web Audio Soundscapes Engine
 * Generates high-quality ambient focus sounds completely offline with ZERO audio files.
 * Works seamlessly in both browser and Android APK.
 */

class SoundscapesEngine {
  private ctx: AudioContext | null = null
  private currentType: 'rain' | 'waves' | 'whitenoise' | 'none' = 'none'
  private masterGain: GainNode | null = null
  private activeNodes: (AudioNode | number)[] = []
  private volume: number = 0.5

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05)
    }
  }

  public play(type: 'rain' | 'waves' | 'whitenoise' | 'none') {
    if (typeof window === 'undefined') return
    this.stop()

    if (type === 'none') {
      this.currentType = 'none'
      return
    }

    const ctx = this.getContext()
    this.currentType = type

    this.masterGain = ctx.createGain()
    this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime)
    this.masterGain.connect(ctx.destination)

    if (type === 'rain') {
      this.startRain(ctx, this.masterGain)
    } else if (type === 'waves') {
      this.startWaves(ctx, this.masterGain)
    } else if (type === 'whitenoise') {
      this.startWhiteNoise(ctx, this.masterGain)
    }
  }

  private startRain(ctx: AudioContext, destination: AudioNode) {
    // Generate pink noise buffer
    const bufferSize = ctx.sampleRate * 4
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04
      b6 = white * 0.115926
    }

    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = buffer
    noiseSource.loop = true

    // Low-pass filter for rainfall tone
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(950, ctx.currentTime)

    noiseSource.connect(filter)
    filter.connect(destination)
    noiseSource.start()

    this.activeNodes.push(noiseSource, filter)
  }

  private startWaves(ctx: AudioContext, destination: AudioNode) {
    const bufferSize = ctx.sampleRate * 4
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.06
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    // Dynamic wave filter
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(450, ctx.currentTime)

    // LFO for periodic wave swell
    const lfo = ctx.createOscillator()
    lfo.frequency.setValueAtTime(0.22, ctx.currentTime)
    const lfoGain = ctx.createGain()
    lfoGain.gain.setValueAtTime(350, ctx.currentTime)

    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)

    noise.connect(filter)
    filter.connect(destination)

    noise.start()
    lfo.start()

    this.activeNodes.push(noise, filter, lfo, lfoGain)
  }

  private startWhiteNoise(ctx: AudioContext, destination: AudioNode) {
    // Warm dual harmonic drone
    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(110, ctx.currentTime) // A2 note

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(164.81, ctx.currentTime) // E3 note

    const droneGain = ctx.createGain()
    droneGain.gain.setValueAtTime(0.04, ctx.currentTime)

    osc1.connect(droneGain)
    osc2.connect(droneGain)
    droneGain.connect(destination)

    osc1.start()
    osc2.start()

    this.activeNodes.push(osc1, osc2, droneGain)
  }

  public playChime() {
    if (typeof window === 'undefined') return
    try {
      const ctx = this.getContext()
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1)

      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 1.2)
    } catch {}
  }

  public stop() {
    this.activeNodes.forEach(node => {
      try {
        if (typeof (node as any).stop === 'function') {
          (node as any).stop()
        }
        if (typeof (node as any).disconnect === 'function') {
          (node as any).disconnect()
        }
      } catch {}
    })
    this.activeNodes = []

    if (this.masterGain) {
      try {
        this.masterGain.disconnect()
      } catch {}
      this.masterGain = null
    }

    this.currentType = 'none'
  }

  public getCurrentType(): 'rain' | 'waves' | 'whitenoise' | 'none' {
    return this.currentType
  }
}

export const soundscapes = new SoundscapesEngine()
