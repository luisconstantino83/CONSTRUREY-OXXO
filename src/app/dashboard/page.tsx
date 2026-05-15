'use client'
import { useFolios } from '@/hooks/useFolios'
import { Countdown } from '@/components/ui/Countdown'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const KPI_CONFIG = [
  { key: 'total',          label: 'Total',         color: 'text-dark-200',  bg: 'bg-dark-700/50'   },
  { key: 'abiertos',       label: 'Activos',       color: 'text-green-400', bg: 'bg-green-500/10'  },
  { key: 'vencidos',       label: 'Vencidos',      color: 'text-red-400',   bg: 'bg-red-500/10'    },
  { key: 'cerrados',       label: 'Cerrados',      color: 'text-dark-300',  bg: 'bg-dark-700/50'   },
  { key: 'altas',          label: 'Alta Prior.',   color: 'text-orange-400',bg: 'bg-orange-500/10' },
  { key: 'medias',         label: 'Media Prior.',  color: 'text-yellow-400',bg: 'bg-yellow-500/10' },
  { key: 'bajas',          label: 'Baja Prior.',   color: 'text-blue-400',  bg: 'bg-blue-500/10'   },
  { key: 'proximosVencer', label: 'Prox. Vencer',  color: 'text-orange-300',bg: 'bg-orange-500/10' },
]

const PRIORITY_COLORS = { ALTA: '#f97316', MEDIA: '#eab308', BAJA: '#3b82f6' }
const STATUS_COLORS   = { Activos: '#22c55e', Cerrados: '#64748b', Vencidos: '#ef4444' }

export default function DashboardPage() {
  const { folios, loading, stats, isVencidoNow } = useFolios()
  const now = Date.now()

  const byCity = ['Reynosa', 'Rio Bravo'].map(ciudad => ({
    ciudad,
    ALTA:  folios.filter(f => f.ciudad === ciudad && f.prioridad === 'ALTA'  && f.estatus !== 'Cerrado').length,
    MEDIA: folios.filter(f => f.ciudad === ciudad && f.prioridad === 'MEDIA' && f.estatus !== 'Cerrado').length,
    BAJA:  folios.filter(f => f.ciudad === ciudad && f.prioridad === 'BAJA'  && f.estatus !== 'Cerrado').length,
  }))

  const byStatus = [
    { name: 'Activos',  value: Math.max(0, stats.abiertos - stats.vencidos) },
    { name: 'Vencidos', value: stats.vencidos },
    { name: 'Cerrados', value: stats.cerrados },
  ].filter(d => d.value > 0)

  const byCat: Record<string, number> = {}
  folios.filter(f => f.estatus !== 'Cerrado').forEach(f => {
    const c = f.categoria || 'Otro'
    byCat[c] = (byCat[c] || 0) + 1
  })
  const catData = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // PROXIMOS A VENCER — solo los que AUN no han vencido, ordenados por urgencia
  const proximosAVencer = [...folios]
    .filter(f => {
      if (f.estatus === 'Cerrado') return false
      const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
      return secs > 0
    })
    .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
    .slice(0, 8)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-dark-400 text-sm mt-1">Monitoreo en tiempo real</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {KPI_CONFIG.map(({ key, label, color, bg }) => {
          const val = stats[key as keyof typeof stats] as number
          const pct = stats.total > 0 ? Math.round((val / stats.total) * 100) : 0
          return (
            <div key={key} className={`card p-4 ${bg}`}>
              <div className={`text-3xl font-black ${color}`}>{val}</div>
              <div className="text-xs text-dark-400 mt-1 font-medium uppercase tracking-wide">{label}</div>
              <div className="text-xs text-dark-500 mt-0.5">{pct}%</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">Folios por Ciudad y Prioridad</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCity} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="ciudad" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#f1f5f9' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="ALTA"  fill={PRIORITY_COLORS.ALTA}  radius={[4,4,0,0]} />
              <Bar dataKey="MEDIA" fill={PRIORITY_COLORS.MEDIA} radius={[4,4,0,0]} />
              <Bar dataKey="BAJA"  fill={PRIORITY_COLORS.BAJA}  radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">Por Estatus</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {byStatus.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] ?? '#64748b'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {catData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">Por Categoria (activos)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={catData} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#22c55e" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* PROXIMOS A VENCER — sin vencidos */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">
          ⏰ Proximos a Vencer
        </h3>
        <div className="space-y-2">
          {proximosAVencer.length === 0 && (
            <p className="text-dark-500 text-sm text-center py-6">Sin folios proximos a vencer</p>
          )}
          {proximosAVencer.map(f => {
            const secsLeft = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
            const borderColor = secsLeft < 3600 ? 'border-red-500/40' : secsLeft < 21600 ? 'border-orange-500/30' : 'border-dark-600'
            const dotColor = f.prioridad === 'ALTA' ? 'bg-orange-400' : f.prioridad === 'MEDIA' ? 'bg-yellow-400' : 'bg-blue-400'
            return (
              <div key={f.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${borderColor} bg-dark-900/50`}>
                <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${dotColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-dark-400">#{f.numero_folio}</span>
                    <span className={`badge-${f.prioridad.toLowerCase()}`}>{f.prioridad}</span>
                  </div>
                  <div className="text-sm text-dark-100 font-medium truncate mt-0.5">{f.tienda_nombre}</div>
                  <div className="text-xs text-dark-500 truncate">{f.falla || f.motivo}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <Countdown fechaVencimiento={f.fecha_vencimiento} estatus={f.estatus} prioridad={f.prioridad} showBar />
                  <div className="text-xs text-dark-500 mt-1">{f.ciudad}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
