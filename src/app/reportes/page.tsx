'use client'
import { useFolios } from '@/hooks/useFolios'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

export default function ReportesPage() {
  const { folios } = useFolios()

  const now = new Date()
  const mesActual   = { start: startOfMonth(now), end: endOfMonth(now) }
  const mesPasado   = { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }

  const inRange = (f: { created_at: string }, range: { start: Date; end: Date }) =>
    isWithinInterval(new Date(f.created_at), range)

  const foliosMesActual = folios.filter(f => inRange(f, mesActual))
  const foliosMesPasado = folios.filter(f => inRange(f, mesPasado))

  const cerradosMesActual = foliosMesActual.filter(f => f.estatus === 'Cerrado')
  const cerradosATiempo   = cerradosMesActual.filter(f => f.cerrado_a_tiempo === true).length
  const cumplimiento      = cerradosMesActual.length > 0
    ? Math.round((cerradosATiempo / cerradosMesActual.length) * 100) : 0

  // Weekly trend (last 8 weeks)
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now.getTime() - (7 - i) * 7 * 86400000)
    const weekEnd   = new Date(weekStart.getTime() + 7 * 86400000)
    const abiertos  = folios.filter(f => isWithinInterval(new Date(f.created_at), { start: weekStart, end: weekEnd })).length
    const cerrados  = folios.filter(f => f.fecha_cierre && isWithinInterval(new Date(f.fecha_cierre), { start: weekStart, end: weekEnd })).length
    return { semana: format(weekStart, 'dd/MM'), abiertos, cerrados }
  })

  // Tiendas problemáticas
  const tiendaCount: Record<string, number> = {}
  folios.forEach(f => { tiendaCount[f.tienda_nombre] = (tiendaCount[f.tienda_nombre] || 0) + 1 })
  const topTiendas = Object.entries(tiendaCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // By category
  const catCount: Record<string, { total: number; cerrados: number }> = {}
  folios.forEach(f => {
    const c = f.categoria || 'Otro'
    if (!catCount[c]) catCount[c] = { total: 0, cerrados: 0 }
    catCount[c].total++
    if (f.estatus === 'Cerrado') catCount[c].cerrados++
  })
  const catData = Object.entries(catCount).sort((a, b) => b[1].total - a[1].total)
    .map(([name, d]) => ({ name, total: d.total, cerrados: d.cerrados, pct: Math.round(d.cerrados / d.total * 100) }))

  // Month compare
  const compareData = [
    { mes: format(subMonths(now, 1), 'MMM', { locale: es }), folios: foliosMesPasado.length, cerrados: foliosMesPasado.filter(f => f.estatus === 'Cerrado').length },
    { mes: format(now, 'MMM', { locale: es }), folios: foliosMesActual.length, cerrados: cerradosMesActual.length },
  ]

  const TT = { contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }, labelStyle: { color: '#f1f5f9' } }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Reportes & Analíticas</h1>
        <p className="text-dark-400 text-sm mt-1">{format(now, "MMMM yyyy", { locale: es })}</p>
      </div>

      {/* KPIs mes actual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Folios Mes Actual',   val: foliosMesActual.length,   color: 'text-white' },
          { label: 'Cerrados a Tiempo',   val: cerradosATiempo,           color: 'text-green-400' },
          { label: '% Cumplimiento',      val: `${cumplimiento}%`,        color: cumplimiento >= 80 ? 'text-green-400' : cumplimiento >= 50 ? 'text-yellow-400' : 'text-red-400' },
          { label: 'Mes Anterior',        val: foliosMesPasado.length,    color: 'text-dark-300' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card p-4">
            <div className={`text-3xl font-black ${color}`}>{val}</div>
            <div className="text-xs text-dark-400 mt-1 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      {/* Compare months */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">Comparativa Mensual</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={compareData} barCategoryGap="40%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
            <Tooltip {...TT} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="folios"  fill="#3b82f6" radius={[4,4,0,0]} name="Abiertos" />
            <Bar dataKey="cerrados" fill="#22c55e" radius={[4,4,0,0]} name="Cerrados" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly trend */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">Tendencia Semanal (8 semanas)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="semana" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
            <Tooltip {...TT} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="abiertos" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 3 }} name="Abiertos" />
            <Line type="monotone" dataKey="cerrados"  stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} name="Cerrados" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top tiendas */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">🏪 Tiendas Problemáticas (Top 10)</h3>
        <div className="space-y-2">
          {topTiendas.map(([tienda, count], i) => (
            <div key={tienda} className="flex items-center gap-3">
              <span className="text-xs text-dark-500 w-5 text-right flex-shrink-0">#{i+1}</span>
              <div className="flex-1 bg-dark-900 rounded-lg overflow-hidden">
                <div className="h-7 flex items-center"
                  style={{ width: `${Math.round(count / topTiendas[0][1] * 100)}%`, minWidth: '3rem' }}
                >
                  <div className="h-full w-full bg-red-500/20 border-r border-red-500/30 flex items-center px-3">
                    <span className="text-xs text-dark-200 truncate font-medium">{tienda}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-red-400 w-6 text-right flex-shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By category */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">Por Categoría</h3>
        <div className="space-y-2">
          {catData.map(({ name, total, cerrados, pct }) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-xs text-dark-400 w-28 truncate flex-shrink-0">{name}</span>
              <div className="flex-1 h-5 bg-dark-900 rounded overflow-hidden">
                <div className="h-full bg-blue-500/30 rounded flex items-center px-2"
                  style={{ width: `${pct}%`, minWidth: pct > 0 ? '2rem' : 0 }}>
                  {pct > 20 && <span className="text-xs text-blue-300">{pct}%</span>}
                </div>
              </div>
              <span className="text-xs text-dark-400 w-16 text-right flex-shrink-0">{cerrados}/{total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
