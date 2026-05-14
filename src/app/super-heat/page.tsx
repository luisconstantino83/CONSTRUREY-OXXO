'use client'
import { useState, useMemo } from 'react'
import { useSuperHeat } from '@/hooks/useSuperHeat'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, CheckCircle2, Clock, Circle, Flame, X } from 'lucide-react'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell
} from 'recharts'
import type { SuperHeat } from '@/types'

export default function SuperHeatPage() {
  const { items, loading, realizados, pendientes, programados, pct, refetch } = useSuperHeat()
  const supabase = createClient()

  const [search, setSearch]     = useState('')
  const [fEstatus, setFEstatus] = useState('todos')
  const [fCiudad, setFCiudad]   = useState('Todas')
  const [selected, setSelected] = useState<SuperHeat | null>(null)
  const [form, setForm]         = useState({ cuadrilla: '', realizado_por: '', comentarios: '', estatus: 'realizado' })
  const [saving, setSaving]     = useState(false)

  const filtered = useMemo(() => items.filter(i => {
    if (fCiudad !== 'Todas' && i.ciudad !== fCiudad) return false
    if (fEstatus !== 'todos' && i.estatus !== fEstatus) return false
    if (search && !i.tienda_nombre.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [items, fCiudad, fEstatus, search])

  const byCity = ['Reynosa', 'Río Bravo'].map(ciudad => ({
    ciudad,
    realizados:  items.filter(i => i.ciudad === ciudad && i.estatus === 'realizado').length,
    pendientes:  items.filter(i => i.ciudad === ciudad && i.estatus === 'pendiente').length,
    programados: items.filter(i => i.ciudad === ciudad && i.estatus === 'programado').length,
  }))

  async function saveUpdate() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase.from('super_heat').update({
      estatus: form.estatus as SuperHeat['estatus'],
      cuadrilla: form.cuadrilla,
      realizado_por: form.realizado_por,
      comentarios: form.comentarios,
      fecha_super_heat: form.estatus === 'realizado' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id)

    if (error) toast.error('Error al guardar')
    else {
      toast.success(`${selected.tienda_nombre} actualizada`)
      setSelected(null)
    }
    setSaving(false)
  }

  const statusIcon = (s: string) =>
    s === 'realizado' ? <CheckCircle2 size={16} className="text-green-400" /> :
    s === 'programado' ? <Clock size={16} className="text-yellow-400" /> :
    <Circle size={16} className="text-dark-500" />

  const statusColor = (s: string) =>
    s === 'realizado' ? 'border-l-green-500' :
    s === 'programado' ? 'border-l-yellow-400' :
    'border-l-dark-600'

  const fbtn = (active: boolean, onClick: () => void, label: string) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-200'}`}>
      {label}
    </button>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
          <Flame size={18} className="text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Super Heat</h1>
          <p className="text-dark-400 text-sm">Control de visitas preventivas</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 bg-dark-800/50">
          <div className="text-3xl font-black text-white">{items.length}</div>
          <div className="text-xs text-dark-400 mt-1 uppercase tracking-wide">Total Tiendas</div>
        </div>
        <div className="card p-4 bg-green-500/10">
          <div className="text-3xl font-black text-green-400">{realizados}</div>
          <div className="text-xs text-dark-400 mt-1 uppercase tracking-wide">Realizados</div>
          <div className="text-xs text-dark-500 mt-0.5">{pct}% completado</div>
        </div>
        <div className="card p-4 bg-yellow-500/10">
          <div className="text-3xl font-black text-yellow-400">{programados}</div>
          <div className="text-xs text-dark-400 mt-1 uppercase tracking-wide">Programados</div>
        </div>
        <div className="card p-4 bg-red-500/10">
          <div className="text-3xl font-black text-red-400">{pendientes}</div>
          <div className="text-xs text-dark-400 mt-1 uppercase tracking-wide">Pendientes</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-dark-200">Avance General</span>
          <span className="text-sm font-bold text-green-400">{pct}%</span>
        </div>
        <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-dark-500">
          <span>{realizados} realizadas</span>
          <span>{items.length - realizados} restantes</span>
        </div>
      </div>

      {/* Charts */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">Avance por Ciudad</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={byCity}>
            <XAxis dataKey="ciudad" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
            <Bar dataKey="realizados"  fill="#22c55e" radius={[4,4,0,0]} name="Realizados" />
            <Bar dataKey="programados" fill="#eab308" radius={[4,4,0,0]} name="Programados" />
            <Bar dataKey="pendientes"  fill="#334155" radius={[4,4,0,0]} name="Pendientes" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters + search */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tienda…" className="input pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-dark-500 uppercase tracking-wide">Ciudad</span>
            {['Todas', 'Reynosa', 'Río Bravo'].map(v => fbtn(fCiudad === v, () => setFCiudad(v), v))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-dark-500 uppercase tracking-wide">Estatus</span>
            {['todos', 'pendiente', 'programado', 'realizado'].map(v => fbtn(fEstatus === v, () => setFEstatus(v), v))}
          </div>
        </div>
      </div>

      {/* Tienda grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(item => (
            <div key={item.id} onClick={() => { setSelected(item); setForm({ cuadrilla: item.cuadrilla || '', realizado_por: item.realizado_por || '', comentarios: item.comentarios || '', estatus: item.estatus }) }}
              className={`card card-hover p-4 border-l-2 ${statusColor(item.estatus)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-dark-100 text-sm truncate">{item.tienda_nombre}</div>
                  <div className="text-xs text-dark-500 mt-0.5">{item.ciudad}</div>
                  {item.cuadrilla && <div className="text-xs text-dark-400 mt-1">🔧 {item.cuadrilla}</div>}
                  {item.fecha_super_heat && (
                    <div className="text-xs text-dark-500 mt-1">
                      {format(new Date(item.fecha_super_heat), 'dd/MM/yyyy HH:mm')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {statusIcon(item.estatus)}
                </div>
              </div>
              {item.comentarios && (
                <div className="text-xs text-dark-500 mt-2 line-clamp-2">{item.comentarios}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-dark-700">
              <div>
                <h3 className="font-bold text-white">{selected.tienda_nombre}</h3>
                <p className="text-xs text-dark-400 mt-0.5">{selected.ciudad}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-dark-400 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-dark-400 uppercase tracking-wide block mb-1.5">Estatus</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pendiente', 'programado', 'realizado'] as const).map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, estatus: s }))}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all capitalize ${form.estatus === s ? s === 'realizado' ? 'bg-green-500/20 text-green-400 border-green-500/40' : s === 'programado' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-dark-600 text-dark-200 border-dark-500' : 'bg-dark-900 text-dark-500 border-dark-700'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-dark-400 uppercase tracking-wide block mb-1.5">Cuadrilla</label>
                <input value={form.cuadrilla} onChange={e => setForm(f => ({ ...f, cuadrilla: e.target.value }))} className="input" placeholder="Nombre de cuadrilla" />
              </div>
              <div>
                <label className="text-xs text-dark-400 uppercase tracking-wide block mb-1.5">Realizado por</label>
                <input value={form.realizado_por} onChange={e => setForm(f => ({ ...f, realizado_por: e.target.value }))} className="input" placeholder="Nombre del técnico" />
              </div>
              <div>
                <label className="text-xs text-dark-400 uppercase tracking-wide block mb-1.5">Comentarios</label>
                <textarea value={form.comentarios} onChange={e => setForm(f => ({ ...f, comentarios: e.target.value }))} rows={3} className="input resize-none" placeholder="Observaciones del servicio…" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="btn-ghost flex-1">Cancelar</button>
                <button onClick={saveUpdate} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'Guardando...' : '✓ Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
