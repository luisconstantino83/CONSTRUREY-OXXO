'use client'
import { useState, useEffect, useCallback } from 'react'

export function useCountdown(fechaVencimiento: string | null | undefined, estatus: string) {
  const calc = useCallback(() => {
    if (!fechaVencimiento || estatus === 'Cerrado') return null
    return Math.floor((new Date(fechaVencimiento).getTime() - Date.now()) / 1000)
  }, [fechaVencimiento, estatus])

  const [segundos, setSegundos] = useState<number | null>(calc)

  useEffect(() => {
    if (!fechaVencimiento || estatus === 'Cerrado') { setSegundos(null); return }
    setSegundos(calc())
    const interval = setInterval(() => setSegundos(calc()), 1000)
    return () => clearInterval(interval)
  }, [fechaVencimiento, estatus, calc])

  return segundos
}
