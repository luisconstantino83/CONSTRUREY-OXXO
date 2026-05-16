'use client'
import { useMemo } from 'react'
import { useFolios } from '@/hooks/useFolios'
import { Lightbulb, MapPin, Flame, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Folio } from '@/types'

interface TiendaGroup {
  tienda: string
  ciudad: string
  altas: Folio[]
  medias: Folio[]
  bajas: Folio[]
  total: number
  prioridadMax: 'ALTA' | 'MEDIA' | 'BAJA'
}

export default function PlanAccionPage() {
  const { folios, loading } = useFolios()

  const grupos = useMemo(() => {
    const activos = folios.filter(f => f.estatus !== 'Cerrado')
    const map: Record<string, TiendaGroup> = {}
    activos.forEach(f => {
      const key = f.tienda_nombre
      if (!map[key]) map[key] = { tienda: f.tienda_nombre, ciudad: f.ciudad, altas: [], medias: [], bajas: [], total: 0, prioridadMax: 'BAJA' }
      if (f.prioridad === 'ALTA') map[key].altas.push(f)
      else if (f.prioridad === 'MEDIA') map[key].medias.push(f)
      else map[key].bajas.push(f)
      map[key].total++
    })
    return Object.values(map)
      .map(g => ({ ...g, prioridadMax: (g.altas.length > 0 ? 'ALTA' : g.medias.length > 0 ? 'MEDIA' : 'BAJA') as any }))
      .filter(g => g.total > 1)
      .sort((a, b) => {
        const pri = { ALTA: 0, MEDIA: 1, BAJA: 2 }
        if (pri[a.prioridadMax] !== pri[b.prioridadMax]) return pri[a.prioridadMax] - pri[b.prioridadMax]
        return b.total - a.total
      })
  }, [folios])

  const singleFolios = useMemo(() => {
    const activos = folios.filter(f => f.estatus !== 'Cerrado')
    const map: Record<string, Folio[]> = {}
    activos.forEach(f => { if (!map[f.tienda_nombre]) map[f.tienda_nombre] = []; map[f.tienda_nombre].push(f) })
    return Object.values(map).filter(g => g.length === 1).map(g => g[0])
      .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
  }, [folios])

  function getRecomendacion(g: TiendaGroup): string {
    if (g.altas.length > 0 && (g.bajas.length > 0 || g.medias.length > 0)) {
      const extra = g.bajas.length + g.medias.length
      return `Aprovechar la visita urgente para resolver tambien ${extra} folio${extra > 1 ? 's' : ''} adicional${extra > 1 ? 'es' : ''}.`
    }
    if (g.altas.length > 1) return `${g.altas.length} urgencias en la misma tienda. Resolver en una sola visita.`
    if (g.medias.length > 0 && g.bajas.length > 0) return `Combinar ${g.medias.length} folio${g.medias.length > 1 ? 's' : ''} MEDIA con ${g.bajas.length} BAJA en una sola vuelta.`
    return `${g.total} folios activos. Programar visita para resolverlos todos juntos.`
  }

  function FolioChip({ f }: { f: Folio }) {
    const secs = (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000
    const isVencido = secs <= 0
    const color = isVencido ? 'bg-red-500/20 text-red-400 border-red-500/30'
      : f.prioridad === 'ALTA'  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      : f.prioridad === 'MEDIA' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${color}`}>
        <span className="font-mono font-bold">#{f.numero_folio}</span>
        <span className="opacity-80 truncate flex-1">{f.falla || f.motivo}</span>
        <span className="opacity-60 whitespace-nowrap flex-shrink-0">
          {isVencido ? 'VENCIDO' : formatDistanceToNow(new Date(f.fecha_vencimiento), { locale: es })}
        </span>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-yellow-500/20 rounded-xl flex items-center justify-center">
          <Lightbulb size={18} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Plan de Accion</h1>
          <p className="text-dark-400 text-sm">Optimiza rutas y aprovecha cada visita</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-black text-yellow-400">{grupos.length}</div>
          <div className="text-xs text-dark-500 mt-1 uppercase tracking-wide">Tiendas a optimizar</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-black text-orange-400">{grupos.reduce((a, g) => a + g.total, 0)}</div>
          <div className="text-xs text-dark-500 mt-1 uppercase tracking-wide">Folios combinables</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-black text-green-400">{grupos.reduce((a, g) => a + g.total - 1, 0)}</div>
          <div className="text-xs text-dark-500 mt-1 uppercase tracking-wide">Vueltas ahorradas</div>
        </div>
      </div>
      {grupos.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-3xl mb-3">🎯</div>
          <div className="text-dark-300 font-medium">Sin oportunidades de optimizacion</div>
          <div className="text-dark-500 text-sm mt-1">Cada tienda tiene solo un folio activo</div>
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(g => {
            const isPrioridad = g.altas.length > 0 && g.bajas.length > 0
            const borderColor = g.prioridadMax === 'ALTA' ? 'border-orange-500/40' : g.prioridadMax === 'MEDIA' ? 'border-yellow-500/30' : 'border-blue-500/20'
            const headerBg = g.prioridadMax === 'ALTA' ? 'bg-orange-500/10' : g.prioridadMax === 'MEDIA' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
            return (
              <div key={g.tienda} className={`card border ${borderColor} overflow-hidden`}>
                <div className={`${headerBg} px-4 py-3 border-b ${borderColor}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={14} className="text-dark-400 flex-shrink-0" />
                      <span className="font-bold text-white text-sm truncate">{g.tienda}</span>
                      <span className="text-xs text-dark-400 flex-shrink-0">{g.ciudad}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPrioridad && (
                        <span className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-500/20 border border-orange-500/30 px-2 py-1 rounded-full">
                          <Flame size={10}/> PRIORIDAD
                        </span>
                      )}
                      <span className="text-xs font-bold text-dark-200 bg-dark-700 px-2 py-1 rounded-full">{g.total} folios</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {g.altas.length  > 0 && <span className="text-xs text-orange-400">🔴 {g.altas.length} ALTA</span>}
                    {g.medias.length > 0 && <span className="text-xs text-yellow-400">🟠 {g.medias.length} MEDIA</span>}
                    {g.bajas.length  > 0 && <span className="text-xs text-blue-400">🔵 {g.bajas.length} BAJA</span>}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2 bg-dark-900 rounded-lg p-3">
                    <Lightbulb size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-yellow-400 mb-0.5">Recomendacion</div>
                      <div className="text-xs text-dark-300">{getRecomendacion(g)}</div>
                    </div>
                  </div>
                  {g.total >= 2 && (
                    <div className="text-xs text-green-400 font-medium">
                      ✅ Se pueden resolver {g.total} folios en una sola visita
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {[...g.altas, ...g.medias, ...g.bajas].map(f => <FolioChip key={f.id} f={f} />)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {singleFolios.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs text-dark-500 uppercase tracking-wide font-semibold px-1">
            Otras tiendas activas ({singleFolios.length})
          </h3>
          {singleFolios.map(f => {
            const secs = (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000
            const isVencido = secs <= 0
            const dot = isVencido ? 'bg-red-500' : f.prioridad === 'ALTA' ? 'bg-orange-400' : f.prioridad === 'MEDIA' ? 'bg-yellow-400' : 'bg-blue-400'
            return (
              <div key={f.id} className="card p-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dark-100 truncate">{f.tienda_nombre}</div>
                  <div className="text-xs text-dark-500 truncate">{f.falla || f.motivo}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-xs font-bold ${isVencido ? 'text-red-400' : f.prioridad === 'ALTA' ? 'text-orange-400' : 'text-dark-400'}`}>{f.prioridad}</div>
                  <div className="text-xs text-dark-500">{f.ciudad}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="card p-4 border border-dark-700 opacity-40">
        <div className="flex items-center gap-2 text-dark-400 text-xs">
          <ChevronRight size={13}/>
          <span>Proximo: Rutas Google Maps · Asignacion automatica · Calculo gasolina</span>
        </div>
      </div>
    </div>
  )
}
