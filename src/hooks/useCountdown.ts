'use client'
import { useState, useEffect, useCallback } from 'react'

export type CountdownColor = 'green' | 'yellow' | 'orange' | 'red'

export interface CountdownResult {
  hours:         number
  minutes:       number
  seconds:       number
  totalSeconds:  number
  isExpired:     boolean
  formattedTime: string
  colorState:    CountdownColor
  colorClass:    string
  bgClass:       string
}

function getColor(secs: number, expired: boolean): CountdownColor {
  if (expired || secs <= 0) return 'red'
  if (secs < 21600) return 'orange'
  if (secs < 86400) return 'yellow'
  return 'green'
}

const COLORS: Record<CountdownColor, { text: string; bg: string }> = {
  green:  { text: 'text-green-400',  bg: 'bg-green-500/10'  },
  yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10' },
  red:    { text: 'text-red-400',    bg: 'bg-red-500/10'    },
}

export function useCountdown(
  fechaVencimiento: string | null | undefined,
  estatus: string
): CountdownResult {
  const calc = useCallback((): CountdownResult => {
    if (!fechaVencimiento || estatus === 'Cerrado') {
      return { hours:0, minutes:0, seconds:0, totalSeconds:0, isExpired:false,
        formattedTime:'Cerrado', colorState:'green', colorClass:'text-dark-400', bgClass:'bg-dark-700/30' }
    }
    const diff  = Math.floor((new Date(fechaVencimiento).getTime() - Date.now()) / 1000)
    const expired = diff <= 0
    const total = Math.max(0, diff)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    let formattedTime: string
    if (expired) {
      formattedTime = 'VENCIDO'
    } else if (h >= 48) {
      const d = Math.floor(h / 24); const rh = h % 24
      formattedTime = ${d}d ${rh}h ${String(m).padStart(2,'0')}m
    } else {
      formattedTime = ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s
    }
    const colorState = getColor(total, expired)
    return { hours:h, minutes:m, seconds:s, totalSeconds:total, isExpired:expired,
      formattedTime, colorState, colorClass:COLORS[colorState].text, bgClass:COLORS[colorState].bg }
  }, [fechaVencimiento, estatus])

  const [state, setState] = useState<CountdownResult>(calc)

  useEffect(() => {
    if (!fechaVencimiento || estatus === 'Cerrado') { setState(calc()); return }
    setState(calc())
    const iv = setInterval(() => setState(calc()), 1000)
    return () => clearInterval(iv)
  }, [fechaVencimiento, estatus, calc])

  return state
}
