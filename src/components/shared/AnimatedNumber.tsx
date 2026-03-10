"use client"
import { useEffect, useState, useRef } from "react"

interface AnimatedNumberProps {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}

export function AnimatedNumber({ value, prefix = "", suffix = "", duration = 2000 }: AnimatedNumberProps) {
  const [current, setCurrent] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.floor(eased * value))
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [started, value, duration])

  return <span ref={ref}>{prefix}{current.toLocaleString()}{suffix}</span>
}
