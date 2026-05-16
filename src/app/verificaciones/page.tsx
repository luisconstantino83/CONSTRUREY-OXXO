'use client'
import { useState, useEffect, useMemo, useCallback } from ‘react’
import { createClient } from ‘@/lib/supabase/client’
import { useAuth } from ‘@/hooks/useAuth’
import { toast } from ‘sonner’
import * as XLSX from ‘xlsx’
import { ClipboardList, Upload, X, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Search, Building2 } from ‘lucide-react’
import { differenceInDays } from ‘date-fns’
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from ‘recharts’

interface Verificacion {
id: string
tienda_nombre: string
zona?: string
numero?: string
pendiente: string
comentario?: string
categoria?: string
causa_raiz?: string
flex_field?: string
estatus: ‘pendiente’ | ‘en_proceso’ | ‘terminado’
responsable?: string
created_at: string
}

interface TiendaIma {
id: string
cr?: string
tienda_nombre: string
ciudad?: string
score_ima?: number
}

interface ExcelRow {
tienda_nombre?: string
zona?: string
plaza?: string
numero?: string
pendiente?: string
comentario?: string
categoria?: string
causa_raiz?: string
flex_field?: string
}

const FLEX_CAT: Record<string, string> = {
IMAG: ‘Mantenimiento General’,
MAE: ‘Aire Acondicionado’,
ILU: ‘Iluminacion’,
PLO: ‘Plomeria’,
SEG: ‘Seguridad’,
REF: ‘Refrigeracion’,
}

const SC = {
pendiente:  { label: ‘Pendiente’,  color: ‘text-yellow-400’, bg: ‘bg-yellow-500/10’, border: ‘border-yellow-500/30’ },
en_proceso: { label: ‘En Proceso’, color: ‘text-blue-400’,   bg: ‘bg-blue-500/10’,   border: ‘border-blue-500/30’   },
terminado:  { label: ‘Terminado’,  color: ‘text-green-400’,  bg: ‘bg-green-500/10’,  border: ‘border-green-500/30’  },
}

function norm(h: string) {
return h.toLowerCase().normalize(‘NFD’).replace(/\p{Diacritic}/gu, ‘’).replace(/\s+/g, ‘_’).trim()
}

function mapRow(row: Record<string, unknown>, tienda: string, zona: string, plaza: string): ExcelRow {
const n: Record<string, string> = {}
Object.entries(row).forEach(([k, v]) => { n[norm(k)] = String(v ?? ‘’).trim() })
return {
zona, plaza, tienda_nombre: tienda,
numero:     n[‘no’] || n[‘num’] || n[‘numero’] || ‘’,
pendiente:  n[‘pendiente’] || n[‘observacion’] || n[‘descripcion’] || ‘’,
comentario: n[‘comentario’] || n[‘comentarios’] || ‘’,
categoria:  n[‘categoria’] || n[‘cat’] || ‘’,
causa_raiz: n[‘causa_raiz’] || n[‘causa’] || ‘’,
flex_field: n[‘flexfield’] || n[‘flex_field’] || n[‘flex’] || ‘’,
}
}

function getScoreBg(score?: number) {
if (!score) return ‘#64748b’
if (score < 80) return ‘#ef4444’
if (score < 85) return ‘#f97316’
if (score < 90) return ‘#eab308’
return ‘#22c55e’
}

function getScoreColor(score?: number) {
if (!score) return ‘text-dark-400’
if (score < 80) return ‘text-red-400’
if (score < 85) return ‘text-orange-400’
if (score < 90) return ‘text-yellow-400’
return ‘text-green-400’
}

export default function VerificacionesPage() {
const supabase = createClient()
const { user } = useAuth()
const isAdmin = user?.rol === ‘admin’

const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
const [tiendasIma, setTiendasIma]         = useState<TiendaIma[]>([])
const [loading, setLoading]               = useState(true)
const [search, setSearch]                 = useState(’’)
const [fEstatus, setFEstatus]             = useState(‘todos’)
const [fCiudad, setFCiudad]               = useState(‘todas’)
const [expanded, setExpanded]             = useState<string | null>(null)
const [showImport, setShowImport]         = useState(false)
const [showGrafica, setShowGrafica]       = useState(false)
const [previewRows, setPreviewRows]       = useState<ExcelRow[]>([])
const [importing, setImporting]           = useState(false)
const [editingId, setEditingId]           = useState<string | null>(null)
const [editingIma, setEditingIma]         = useState<string | null>(null)
const [imaInput, setImaInput]             = useState(’’)

const fetchData = useCallback(async () => {
const [{ data: verif }, { data: ima }] = await Promise.all([
supabase.from(‘verificaciones’).select(’*’).order(‘tienda_nombre’).order(‘created_at’, { ascending: false }),
supabase.from(‘tiendas_ima’).select(’*’).order(‘score_ima’, { ascending: true }),
])
if (verif) setVerificaciones(verif as Verificacion[])
if (ima)   setTiendasIma(ima as TiendaIma[])
setLoading(false)
}, [supabase])

useEffect(() => {
fetchData()
const ch = supabase.channel(‘verif-rt’)
.on(‘postgres_changes’, { event: ‘*’, schema: ‘public’, table: ‘verificaciones’ }, fetchData)
.on(‘postgres_changes’, { event: ’*’, schema: ‘public’, table: ‘tiendas_ima’ }, fetchData)
.subscribe()
return () => { supabase.removeChannel(ch) }
}, [fetchData, supabase])

const imaMap = useMemo(() => {
const m: Record<string, number> = {}
tiendasIma.forEach(t => { if (t.score_ima) m[t.tienda_nombre.toLowerCase()] = t.score_ima })
return m
}, [tiendasIma])

const tiendas = useMemo(() => {
const filtered = verificaciones.filter(v => {
if (fEstatus !== ‘todos’ && v.estatus !== fEstatus) return false
if (fCiudad !== ‘todas’) {
const zona = (v.zona || ‘’).toLowerCase()
if (fCiudad === ‘reynosa’   && !zona.includes(‘reynosa’))   return false
if (fCiudad === ‘rio_bravo’ && !zona.includes(‘rio bravo’)) return false
}
if (search) {
const s = search.toLowerCase()
return v.tienda_nombre.toLowerCase().includes(s) || v.pendiente.toLowerCase().includes(s)
}
return true
})
const map: Record<string, Verificacion[]> = {}
filtered.forEach(v => {
if (!map[v.tienda_nombre]) map[v.tienda_nombre] = []
map[v.tienda_nombre].push(v)
})
return Object.entries(map).map(([nombre, items]) => ({
nombre, items,
pendientes: items.filter(i => i.estatus === ‘pendiente’).length,
en_proceso: items.filter(i => i.estatus === ‘en_proceso’).length,
terminados: items.filter(i => i.estatus === ‘terminado’).length,
total: items.length,
score: imaMap[nombre.toLowerCase()],
ciudad: items[0]?.zona || ‘’,
hasAlert: items.some(i => i.estatus === ‘pendiente’ && differenceInDays(new Date(), new Date(i.created_at)) > 5),
})).sort((a, b) => {
if (a.score && b.score) return a.score - b.score
if (a.score && !b.score) return -1
if (!a.score && b.score) return 1
return b.pendientes - a.pendientes
})
}, [verificaciones, fEstatus, fCiudad, search, imaMap])

const stats = useMemo(() => ({
total:      verificaciones.length,
pendientes: verificaciones.filter(v => v.estatus === ‘pendiente’).length,
en_proceso: verificaciones.filter(v => v.estatus === ‘en_proceso’).length,
terminados: verificaciones.filter(v => v.estatus === ‘terminado’).length,
tiendas:    new Set(verificaciones.map(v => v.tienda_nombre)).size,
}), [verificaciones])

const chartData = useMemo(() => {
return tiendasIma
.filter(t => t.score_ima)
.sort((a, b) => (a.score_ima || 0) - (b.score_ima || 0))
.slice(0, 15)
.map(t => ({ name: t.tienda_nombre, score: t.score_ima }))
}, [tiendasIma])

function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
const file = e.target.files?.[0]
if (!file) return
const reader = new FileReader()
reader.onload = (ev) => {
const data = new Uint8Array(ev.target?.result as ArrayBuffer)
const wb = XLSX.read(data, { type: ‘array’ })
const ws = wb.Sheets[wb.SheetNames[0]]
const rawAll = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][]
const zona   = String(rawAll[0]?.[1] ?? ‘’).trim()
const plaza  = String(rawAll[1]?.[1] ?? ‘’).trim()
const tienda = String(rawAll[2]?.[1] ?? ‘’).trim()
const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: ‘’, range: 4 })
const rows = raw.map(r => mapRow(r, tienda, zona, plaza)).filter(r => r.pendiente && r.tienda_nombre)
setPreviewRows(rows)
setShowImport(true)
}
reader.readAsArrayBuffer(file)
}

async function confirmImport() {
setImporting(true)
const inserts = previewRows.map(r => ({
tienda_nombre: r.tienda_nombre || ‘Sin tienda’,
zona: r.zona, numero: r.numero,
pendiente: r.pendiente || ‘Sin descripcion’,
comentario: r.comentario,
categoria: r.categoria || (r.flex_field ? FLEX_CAT[r.flex_field.toUpperCase()] : null),
causa_raiz: r.causa_raiz, flex_field: r.flex_field, estatus: ‘pendiente’,
}))
const { error } = await supabase.from(‘verificaciones’).insert(inserts)
if (error) { toast.error(‘Error al importar’) }
else { toast.success(inserts.length + ’ verificaciones importadas’); setShowImport(false); setPreviewRows([]); fetchData() }
setImporting(false)
}

async function updateEstatus(id: string, estatus: string) {
await supabase.from(‘verificaciones’).update({ estatus, updated_at: new Date().toISOString() }).eq(‘id’, id)
fetchData()
}

async function updateResponsable(id: string, responsable: string) {
await supabase.from(‘verificaciones’).update({ responsable, updated_at: new Date().toISOString() }).eq(‘id’, id)
setEditingId(null); fetchData()
}

async function saveIma(tienda: string) {
const scoreNum = parseFloat(imaInput)
if (isNaN(scoreNum)) { toast.error(‘Score invalido’); return }
await supabase.from(‘tiendas_ima’).upsert({
tienda_nombre: tienda, score_ima: scoreNum,
updated_at: new Date().toISOString(),
}, { onConflict: ‘tienda_nombre’ })
setEditingIma(null); setImaInput(’’); fetchData()
toast.success(‘Score IMA guardado’)
}

const fbtn = (active: boolean, onClick: () => void, label: string) => (
<button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-200'}`}>{label}</button>
)

if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" /></div>

return (
<div className="space-y-5 animate-fade-in">
<div className="flex items-center justify-between flex-wrap gap-3">
<div className="flex items-center gap-3">
<div className="w-9 h-9 bg-purple-500/20 rounded-xl flex items-center justify-center">
<ClipboardList size={18} className="text-purple-400" />
</div>
<div>
<h1 className="text-2xl font-bold text-white">Verificaciones</h1>
<p className="text-dark-400 text-sm">Auditorias y pendientes por tienda</p>
</div>
</div>
<div className="flex gap-2">
<button onClick={() => setShowGrafica(!showGrafica)} className=“btn-ghost flex items-center gap-2 text-xs”>
Grafica IMA
</button>
{isAdmin && (
<label className="btn-primary flex items-center gap-2 cursor-pointer">
<Upload size={14} /> Importar Excel
<input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
</label>
)}
</div>
</div>

```
  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
    {[
      { label: 'Tiendas',    val: stats.tiendas,    color: 'text-white'      },
      { label: 'Total',      val: stats.total,      color: 'text-dark-200'   },
      { label: 'Pendientes', val: stats.pendientes, color: 'text-yellow-400' },
      { label: 'En Proceso', val: stats.en_proceso, color: 'text-blue-400'   },
      { label: 'Terminados', val: stats.terminados, color: 'text-green-400'  },
    ].map(({ label, val, color }) => (
      <div key={label} className="card p-4 text-center">
        <div className={`text-2xl font-black ${color}`}>{val}</div>
        <div className="text-xs text-dark-500 mt-1 uppercase tracking-wide">{label}</div>
      </div>
    ))}
  </div>

  {showGrafica && chartData.length > 0 && (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">
        Score IMA — Prioridad (menor = mas urgente)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={120} />
          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number) => [v + '%', 'IMA']} />
          <Bar dataKey="score" radius={[0,4,4,0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={getScoreBg(entry.score as number)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 justify-center text-xs flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"/>Critico menos de 80</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400 inline-block"/>Bajo 80-85</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block"/>Regular 85-90</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block"/>Bueno mas de 90</span>
      </div>
    </div>
  )}

  <div className="card p-4 space-y-3">
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tienda, pendiente..." className="input pl-9" />
    </div>
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-xs text-dark-500 uppercase tracking-wide">Ciudad</span>
      {fbtn(fCiudad==='todas',     ()=>setFCiudad('todas'),     'Todas')}
      {fbtn(fCiudad==='reynosa',   ()=>setFCiudad('reynosa'),   'Reynosa')}
      {fbtn(fCiudad==='rio_bravo', ()=>setFCiudad('rio_bravo'), 'Rio Bravo')}
    </div>
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-xs text-dark-500 uppercase tracking-wide">Estatus</span>
      {fbtn(fEstatus==='todos',      ()=>setFEstatus('todos'),      'Todos')}
      {fbtn(fEstatus==='pendiente',  ()=>setFEstatus('pendiente'),  'Pendientes')}
      {fbtn(fEstatus==='en_proceso', ()=>setFEstatus('en_proceso'), 'En Proceso')}
      {fbtn(fEstatus==='terminado',  ()=>setFEstatus('terminado'),  'Terminados')}
    </div>
  </div>

  {tiendas.length === 0 ? (
    <div className="card p-16 text-center">
      <ClipboardList size={32} className="text-dark-600 mx-auto mb-3" />
      <div className="text-dark-300 font-medium">Sin verificaciones</div>
      <div className="text-dark-500 text-sm mt-1">Importa un Excel para empezar</div>
    </div>
  ) : (
    <div className="space-y-3">
      {tiendas.map((t, idx) => {
        const isExpanded = expanded === t.nombre
        const scoreColor = getScoreColor(t.score)
        const isCritico = t.score !== undefined && t.score < 80
        return (
          <div key={t.nombre} className={`card overflow-hidden border ${isCritico ? 'border-red-500/40' : t.hasAlert ? 'border-orange-500/30' : 'border-dark-700'}`}>
            <button onClick={() => setExpanded(isExpanded ? null : t.nombre)}
              className="w-full px-4 py-4 flex items-center justify-between gap-3 hover:bg-dark-700/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-dark-300">{idx+1}</span>
                </div>
                <Building2 size={16} className="text-dark-400 flex-shrink-0" />
                <div className="text-left min-w-0">
                  <div className="font-semibold text-dark-100 truncate">{t.nombre}</div>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {t.pendientes > 0 && <span className="text-xs text-yellow-400">{t.pendientes} pendientes</span>}
                    {t.en_proceso > 0 && <span className="text-xs text-blue-400">{t.en_proceso} en proceso</span>}
                    {t.terminados > 0 && <span className="text-xs text-green-400">{t.terminados} terminados</span>}
                    {t.ciudad && <span className="text-xs text-dark-500">{t.ciudad}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {t.score !== undefined ? (
                  <div className="text-right">
                    <div className={`text-lg font-black ${scoreColor}`}>{t.score}</div>
                    <div className="text-xs text-dark-500">IMA</div>
                  </div>
                ) : isAdmin ? (
                  <button onClick={e => { e.stopPropagation(); setEditingIma(t.nombre); setImaInput('') }}
                    className="text-xs text-dark-500 hover:text-dark-300 border border-dark-600 px-2 py-1 rounded-lg">
                    + IMA
                  </button>
                ) : null}
                {isCritico && <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">Critico</span>}
                {t.hasAlert && !isCritico && <AlertTriangle size={14} className="text-orange-400"/>}
                <span className="text-xs text-dark-400 bg-dark-700 px-2 py-1 rounded-full">{t.total}</span>
                {isExpanded ? <ChevronUp size={16} className="text-dark-400"/> : <ChevronDown size={16} className="text-dark-400"/>}
              </div>
            </button>

            {editingIma === t.nombre && isAdmin && (
              <div className="px-4 pb-3 flex gap-2 items-center border-t border-dark-700 pt-3">
                <input
                  autoFocus
                  value={imaInput}
                  onChange={e => setImaInput(e.target.value)}
                  placeholder="Score IMA ej: 85.45"
                  className="input text-sm flex-1 max-w-xs"
                  onKeyDown={e => { if (e.key === 'Enter') saveIma(t.nombre) }}
                />
                <button onClick={() => saveIma(t.nombre)} className="btn-primary text-xs px-3 py-2">Guardar</button>
                <button onClick={() => setEditingIma(null)} className="btn-ghost text-xs px-3 py-2">Cancelar</button>
              </div>
            )}

            {isExpanded && (
              <div className="border-t border-dark-700 divide-y divide-dark-700/50">
                {t.items.map(v => {
                  const sc = SC[v.estatus]
                  const dias = differenceInDays(new Date(), new Date(v.created_at))
                  const isOld = dias > 5 && v.estatus === 'pendiente'
                  return (
                    <div key={v.id} className={`px-4 py-3 ${isOld ? 'bg-orange-500/5' : ''}`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => {
                          const next = v.estatus === 'pendiente' ? 'en_proceso' : v.estatus === 'en_proceso' ? 'terminado' : 'pendiente'
                          updateEstatus(v.id, next)
                        }} className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${v.estatus === 'terminado' ? 'bg-green-500 border-green-500' : v.estatus === 'en_proceso' ? 'bg-blue-500/20 border-blue-400' : 'border-dark-500 hover:border-dark-300'}`}>
                          {v.estatus === 'terminado' && <CheckCircle size={12} className="text-white"/>}
                          {v.estatus === 'en_proceso' && <Clock size={12} className="text-blue-400"/>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${v.estatus === 'terminado' ? 'line-through text-dark-500' : 'text-dark-100'}`}>{v.pendiente}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color} ${sc.border}`}>{sc.label}</span>
                            {isOld && <span className="text-xs text-orange-400">{dias}d</span>}
                          </div>
                          {v.comentario && <div className="text-xs text-dark-400 mt-0.5">{v.comentario}</div>}
                          <div className="flex gap-3 mt-1 flex-wrap">
                            {v.flex_field && <span className="text-xs text-purple-400 font-mono">{v.flex_field}</span>}
                            {v.categoria  && <span className="text-xs text-dark-500">{v.categoria}</span>}
                          </div>
                          {editingId === v.id ? (
                            <input autoFocus defaultValue={v.responsable || ''}
                              onBlur={e => updateResponsable(v.id, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') updateResponsable(v.id, (e.target as HTMLInputElement).value) }}
                              placeholder="Responsable" className="input text-xs py-1 mt-2 w-full max-w-xs" />
                          ) : (
                            <button onClick={() => setEditingId(v.id)} className="text-xs text-dark-500 hover:text-dark-300 mt-1.5">
                              {v.responsable || 'Asignar responsable'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )}

  {showImport && (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-white">Vista previa - {previewRows.length} registros</h3>
            <p className="text-xs text-dark-400 mt-0.5">Revisa antes de confirmar</p>
          </div>
          <button onClick={() => { setShowImport(false); setPreviewRows([]) }} className="text-dark-400 hover:text-white"><X size={20}/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {previewRows.slice(0, 50).map((r, i) => (
            <div key={i} className="bg-dark-900 rounded-lg p-3 flex items-start gap-3">
              <span className="text-xs text-dark-600 font-mono w-6 flex-shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-dark-100 truncate">{r.tienda_nombre}</span>
                  {r.flex_field && <span className="text-xs text-purple-400 font-mono">{r.flex_field}</span>}
                </div>
                <div className="text-xs text-dark-400 mt-0.5 truncate">{r.pendiente}</div>
                {r.comentario && <div className="text-xs text-dark-500 truncate">{r.comentario}</div>}
              </div>
            </div>
          ))}
          {previewRows.length > 50 && <div className="text-center text-xs text-dark-500 py-2">... y {previewRows.length - 50} mas</div>}
        </div>
        <div className="px-6 py-4 border-t border-dark-700 flex gap-3 flex-shrink-0">
          <button onClick={() => { setShowImport(false); setPreviewRows([]) }} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={confirmImport} disabled={importing || previewRows.length === 0} className="btn-primary flex-1 disabled:opacity-50">
            {importing ? 'Importando...' : 'Confirmar ' + previewRows.length + ' registros'}
          </button>
        </div>
      </div>
    </div>
  )}
</div>
```

)
}
