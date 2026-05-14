'use client'
import { useCountdown } from '@/hooks/useCountdown'
import { formatTiempoRestante, getColorByTime } from '@/lib/parser'

interface Props {
  fechaVencimiento: string
  estatus: string
  className?: string
  showBar?: boolean
  prioridad?: string
}

const TOTAL_SECS: Record<string, number> = { ALTA: 21600, MEDIA: 259200, BAJA: 2505600 }

export function Countdown({ fechaVencimiento, estatus, className, showBar, prioridad }: Props) {
  const secs = useCountdown(fechaVencimiento, estatus)

  if (estatus === 'Cerrado') {
    return <span className={`text-dark-400 text-xs ${className}`}>Cerrado</span>
  }

  const s = secs ?? 0
  const label = formatTiempoRestante(s)
  const color = getColorByTime(s, estatus)
  const pct = prioridad ? Math.max(0, Math.min(100, (s / (TOTAL_SECS[prioridad] || 21600)) * 100)) : null

  const barColor = s <= 0 ? 'bg-red-500' : s < 3600 ? 'bg-red-400' : s < 21600 ? 'bg-orange-400' : s < 86400 ? 'bg-yellow-400' : 'bg-green-400'

  return (
    <div className={className}>
      <span className={`font-mono font-bold text-sm ${color}`}>
        {label}
      </span>
      {showBar && pct !== null && (
        <div className="mt-1 h-1 bg-dark-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
