'use client'
import { useCountdown } from '@/hooks/useCountdown'

interface Props {
  fechaVencimiento: string
  estatus: string
  prioridad?: string
  showBar?: boolean
  className?: string
}

const TOTAL_SECS: Record<string, number> = { ALTA: 21600, MEDIA: 259200, BAJA: 2505600 }

export function Countdown({ fechaVencimiento, estatus, prioridad, showBar, className }: Props) {
  const cd = useCountdown(fechaVencimiento, estatus)

  if (estatus === 'Cerrado') {
    return <span className={`text-dark-400 text-xs font-medium ${className ?? ''}`}>✓ Cerrado</span>
  }

  const pct = prioridad
    ? Math.max(0, Math.min(100, (cd.totalSeconds / (TOTAL_SECS[prioridad] || 21600)) * 100))
    : null

  const barColor =
    cd.colorState === 'red'    ? 'bg-red-500'    :
    cd.colorState === 'orange' ? 'bg-orange-400' :
    cd.colorState === 'yellow' ? 'bg-yellow-400' : 'bg-green-400'

  return (
    <div className={className ?? ''}>
      <span className={`font-mono font-bold text-sm tabular-nums tracking-tight ${cd.colorClass}`}>
        {cd.formattedTime}
      </span>
      {showBar && pct !== null && (
        <div className="mt-1 h-1 bg-dark-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
