"use client"

import type { CSSProperties } from "react"
import { useEffect, useState } from "react"

const COLORS = ["#22c55e", "#eab308", "#3b82f6", "#ef4444", "#a855f7", "#06b6d4"]

type Particle = {
  id: number
  x: number
  color: string
  delay: number
  duration: number
  size: number
  rotate: number
  shape: string
}

export function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 60 }, (_, index) => ({
        id: index,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
        shape: Math.random() > 0.5 ? "50%" : "2px",
      })),
    )
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute top-0 animate-[confetti-fall_var(--dur)_ease-in_var(--delay)_forwards]"
          style={{
            left: `${particle.x}%`,
            "--delay": `${particle.delay}s`,
            "--dur": `${particle.duration}s`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: particle.shape,
            transform: `rotate(${particle.rotate}deg)`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}
