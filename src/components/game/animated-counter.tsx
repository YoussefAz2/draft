"use client"

import { useEffect, useState } from "react"
import { animate } from "framer-motion"

export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 0.8,
  delay = 0,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number
  decimals?: number
  duration?: number
  delay?: number
  suffix?: string
  prefix?: string
  className?: string
}) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(latest),
    })

    return () => {
      controls.stop()
    }
  }, [delay, duration, value])

  return <span className={className}>{prefix}{displayValue.toFixed(decimals)}{suffix}</span>
}
