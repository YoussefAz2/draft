let audioContext: AudioContext | null = null

type SoundName = "bid" | "sold" | "unsold" | "timerWarning" | "victory" | "defeat" | "newRound"

function getAudioContext() {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return null
  }

  if (!audioContext) {
    audioContext = new window.AudioContext()
  }

  return audioContext
}

function scheduleTone(
  ctx: AudioContext,
  options: {
    type: OscillatorType
    start: number
    stop: number
    volume: number
    frequency: number
    setup?: (oscillator: OscillatorNode, gain: GainNode, start: number) => void
  },
) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = options.type
  oscillator.frequency.setValueAtTime(options.frequency, options.start)
  gain.gain.setValueAtTime(Math.max(options.volume, 0.001), options.start)

  options.setup?.(oscillator, gain, options.start)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(options.start)
  oscillator.stop(options.stop)
}

export function playSound(name: SoundName, volume = 0.3) {
  if (typeof window === "undefined") {
    return
  }

  try {
    const ctx = getAudioContext()

    if (!ctx) {
      return
    }

    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined)
    }

    const now = ctx.currentTime

    switch (name) {
      case "bid": {
        scheduleTone(ctx, {
          type: "sine",
          start: now,
          stop: now + 0.15,
          volume,
          frequency: 400,
          setup: (oscillator, gain, start) => {
            oscillator.frequency.linearRampToValueAtTime(600, start + 0.1)
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15)
          },
        })
        break
      }
      case "sold": {
        ;[0, 0.12].forEach((offset) => {
          scheduleTone(ctx, {
            type: "sine",
            start: now + offset,
            stop: now + offset + 0.2,
            volume,
            frequency: 800,
            setup: (_, gain, start) => {
              gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2)
            },
          })
        })
        break
      }
      case "timerWarning": {
        scheduleTone(ctx, {
          type: "square",
          start: now,
          stop: now + 0.05,
          volume: volume * 0.5,
          frequency: 1000,
          setup: (_, gain, start) => {
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.05)
          },
        })
        break
      }
      case "victory": {
        ;[523, 659, 784].forEach((frequency, index) => {
          const offset = index * 0.15
          scheduleTone(ctx, {
            type: "sine",
            start: now + offset,
            stop: now + offset + 0.4,
            volume,
            frequency,
            setup: (_, gain, start) => {
              gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4)
            },
          })
        })
        break
      }
      case "defeat": {
        scheduleTone(ctx, {
          type: "sine",
          start: now,
          stop: now + 0.6,
          volume,
          frequency: 400,
          setup: (oscillator, gain, start) => {
            oscillator.frequency.linearRampToValueAtTime(200, start + 0.5)
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.6)
          },
        })
        break
      }
      case "newRound": {
        scheduleTone(ctx, {
          type: "sine",
          start: now,
          stop: now + 0.3,
          volume: volume * 0.4,
          frequency: 200,
          setup: (oscillator, gain, start) => {
            oscillator.frequency.exponentialRampToValueAtTime(800, start + 0.15)
            oscillator.frequency.exponentialRampToValueAtTime(200, start + 0.3)
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3)
          },
        })
        break
      }
      case "unsold": {
        scheduleTone(ctx, {
          type: "triangle",
          start: now,
          stop: now + 0.3,
          volume: volume * 0.3,
          frequency: 250,
          setup: (_, gain, start) => {
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3)
          },
        })
        break
      }
    }
  } catch {
  }
}
