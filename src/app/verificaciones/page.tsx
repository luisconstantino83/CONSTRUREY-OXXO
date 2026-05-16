'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { ClipboardList, Upload, X, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Search, Building2, BarChart3 } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Verificacion {
  id: string
  tienda_nombre: string
  zona?: string
  plaza?: string
  numero?: string
  pendiente: string
  comentario?: string
  categoria?: string
  causa_raiz?: string
  flex_field?: string
  estatus: 'pendiente' | 'en_proceso' | 'terminado'
  responsable?: string
  created_at: string
}

interface TiendaIma {
  id: string
  cr?: string
  tienda_nombre: string
  ciudad?: string
  score_ima?: number
  periodo?: string
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
  IMAG: 'Mantenimiento General',
  MAE: 'Aire Acondicionado',
  ILU: 'Iluminacion',
  PLO: 'Plomeria',
  SEG: 'Seguridad',
  REF: 'Refrigeracion',
}

const SC = {
  pendiente:  { label: 'Pendiente',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  en_proceso: { label: 'En Proceso', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
  terminado:  { label: 'Terminado',  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  },
}

function norm(h: string) {
  return h.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '_').trim()
}

function mapRow(row: Record<string, unknown>, tienda: string, zona: string, plaza: string): ExcelRow {
  const n: Record<string, string> = {}
  Object.entries(row).forEach(([k, v]) => { n[norm(k)] = String(v ?? '').trim() })
  return {
    zona, plaza, tienda_nombre: tienda,
    numero:     n['no'] || n['num'] || n['numero'] || '',
    pendiente:  n['pendiente'] || n['observacion'] || n['descripcion'] || '',
    comentario: n['comentario'] || n['comentarios'] || '',
    categoria:  n['categoria'] || n['cat'] || '',
    causa_raiz: n['causa_raiz'] || n['causa'] || '',
    flex_field: n['flexfield'] || n['flex_field'] || n['flex'] || '',
  }
}

function getScoreColor(score?: number) {
  if (!score) return 'text-dark-400'
  if (score < 80) return 'text-red-400'
  if (score < 85) return 'text-orange-400'
  if (score < 90) return 'text-yellow-400'
  return 'text-green-400'
}

function getScoreBg(score?: number) {
  if (!score) return '#64748b'
  if (score < 80) return '#ef4444'
  if (score < 85) return '#f97316'
  if (score < 90) return '#eab308'
  return '#22c55e'
}

export default function VerificacionesPage() {
  const supabase = createClient()
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
  const [tiendasIma, setTiendasIma]         = useState<TiendaIma[]>([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [fEstatus, setFEstatus]             = useState('todos')
  const [fCiudad, setFCiudad]               = useState('todas')
  const [expanded, setExpanded]             = useState<string | null>(null)
  const [showImport, setShowImport]         = useState(false)
  const [showGrafica, setShowGrafica]       = useState(false)
  const [previewRows, setPreviewRows]       = useState<ExcelRow[]>([])
  const [importing, setImporting]           = useState(false)
  const [editingId, setEditingId]           = useState<string | null>(null)
  const [editingIma, setEditingIma]         = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [{ data: verif }, { data: ima }] = await Promise.all([
      supabase.from('verificaciones').select('*').order('tienda_nombre').order('created_at', { ascending: false }),
      supabase.from('tiendas_ima').select('*').order('score_ima', { ascending: true }),
    ])
    if (verif) setVerificaciones(verif as Verificacion[])
    if (ima)   setTiendasIma(ima as TiendaIma[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
    const ch = supabase.channel('verif-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verificaciones' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tiendas_ima' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchData, supabase])

  // Map score IMA por tienda
  const imaMap = useMemo(() => {
    const m: Record<string, number> = {}
    tiendasIma.forEach(t => { if (t.score_ima) m[t.tienda_nombre.toLowerCase()] = t.score_ima })
    return m
  }, [tiendasIma])

  const tiendas = useMemo(() => {
    const filtered = verificaciones.filter(v => {
      if (fEstatus !== 'todos' && v.estatus !== fEstatus) return false
      if (fCiudad !== 'todas') {
        const zona = (v.zona || '').toLowerCase()
        if (fCiudad === 'reynosa'   && !zona.includes('reynosa'))   return false
        if (fCiudad === 'rio_bravo' && !zona.includes('rio bravo') && !zona.includes('río bravo')) return false
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
      pendientes: items.filter(i => i.estatus === 'pendiente').length,
      en_proceso: items.filter(i => i.estatus === 'en_proceso').length,
      terminados: items.filter(i => i.estatus === 'terminado').length,
      total: items.length,
      score: imaMap[nombre.toLowerCase()],
      ciudad: items[0]?.zona || '',
      hasAlert: items.some(i => i.estatus === 'pendiente' && differenceInDays(new Date(), new Date(i.created_at)) > 5),
    })).sort((a, b) => {
      // Primero por score IMA (menor = más urgente)
      if (a.score && b.score) return a.score - b.score
      if (a.score && !b.score) return -1
      if (!a.score && b.score) return 1
      // Luego por pendientes
      return b.pendientes - a.pendientes
    })
  }, [verificaciones, fEstatus, fCiudad, search, imaMap])

  const stats = useMemo(() => ({
    total:      verificaciones.length,
    pendientes: verificaciones.filter(v => v.estatus === 'pendiente').length,
    en_proceso: verificaciones.filter(v => v.estatus === 'en_proceso').length,
    terminados: verificaciones.filter(v => v.estatus === 'terminado').length,
    tiendas:    new Set(verificaciones.map(v => v.tienda_nombre)).size,
  }), [verificaciones])

  // Chart data — top tiendas con score bajo
  const chartData = useMemo(() => {
    return tiendasIma
      .filter(t => t.score_ima)
      .sort((a, b) => (a.score_ima || 0) - (b.score_ima || 0))
      .slice(0, 15)
      .map(t => ({ name: t.tienda_nombre, score: t.score_ima, fill: getScoreBg(t.score_ima) }))
  }, [tiendasIma])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawAll = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][]
      const zona   = String(rawAll[0]?.[1] ?? '').trim()
      const plaza  = String(rawAll[1]?.[1] ?? '').trim()
      const tienda = String(rawAll[2]?.[1] ?? '').trim()
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', range: 4 })
      const rows = raw.map(r => mapRow(r, tienda, zona, plaza)).filter(r => r.pendiente && r.tienda_nombre)
      setPreviewRows(rows)
      setShowImport(true)
    }
    reader.readAsArrayBuffer(file)
  }

  async function confirmImport() {
    setImporting(true)
    const inserts = previewRows.map(r => ({
      tienda_nombre: r.tienda_nombre || 'Sin tienda',
      zona: r.zona, plaza: r.plaza, numero: r.numero,
      pendiente: r.pendiente || 'Sin descripcion',
      comentario: r.comentario,
      categoria: r.categoria || (r.flex_field ? FLEX_CAT[r.flex_field.toUpperCase()] : null),
      causa_raiz: r.causa_raiz, flex_field: r.flex_field, estatus: 'pendiente',
    }))
    const { error } = await supabase.from('verificaciones').insert(inserts)
    if (error) { toast.error('Error al importar') }
    else { toast.success(`${inserts.length} verificaciones importadas`); setShowImport(false); setPreviewRows([]); fetchData() }
    setImporting(false)
  }

  async function updateEstatus(id: string, estatus: string) {
    await supabase.from('verificaciones').update({ estatus, updated_at: new Date().toISOString() }).eq('id', id)
    fetchData()
  }

  async function updateResponsable(id: string, responsable: string) {
    await supabase.from('verificaciones').update({ responsable, updated_at: new Date().toISOString() }).eq('id', id)
    setEditingId(null); fetchData()
  }

  async function saveIma(tienda: string, score: string, cr?: string) {
    const scoreNum = parseFloat(score)
    if (isNaN(scoreNum)) { toast.error('Score invalido'); return }
    await supabase.from('tiendas_ima').upsert({
      tienda_nombre: tienda, score_ima: scoreNum, cr: cr || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tienda_nombre' })
    setEditingIma(null); fetchData()
    toast.success('Score IMA guardado')
  }

  const fbtn = (active: boolean, onClick: () => void, label: string) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-200'}`}>{label}</button>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-500/20 rounded-xl
