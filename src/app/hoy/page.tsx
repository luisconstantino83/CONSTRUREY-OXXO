'use client'
import { useMemo, useState } from 'react'
import { useFolios } from '@/hooks/useFolios'
import { Countdown } from '@/components/ui/Countdown'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Clock, X, UserPlus } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Folio } from '@/types'

export default function HoyPage() {
  const { folios, refetch } = useFolios()
  const supabase = createClient()
  const [closing, setClosing] = useState<Folio | null>(null)
  const [comment, setComment] = useState('')
  const [assigning, setAssigning] = useState<Folio | null>(null)
  const [tecnico, setTecnico] = useState('')
  const [saving, setSaving] = useState(false)

  const hoy = useMemo(() => {
    return [...folios]
      .filter(f => {
        if (f.estatus === 'Cerrado') return false
        const venc = new Date(f.fecha_vencimiento)
        const secs = (venc.getTime() - Date.now()) / 1000
        return isToday(venc) || secs <= 0
      })
      .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
  }, [folios])

  const vencidos = hoy.filter(f => (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000 <= 0)
  const activos  = hoy.filter(f => (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000 > 0)
  const altas    = activos.filter(f => f.prioridad === 'ALTA')
  const medias   = activos.filter(f => f.prioridad === 'MEDIA')
  const bajas    = activos.filter(f => f.prioridad === 'BAJA')

  async function handleClose() {
    if (!closing || !comment.trim()) return
    setSaving(true)
    const now = new Date()
    const venc = new Date(closing.fecha_vencimiento)
    const aTiempo = now <= venc
    const mins = aTiempo ? 0 : Math.floor((now.getTime() - venc.getTime()) / 60000)
    await supabase.from('folios').update({
      estatus: 'Cerrado',
      fecha_cierre: now.toISOString(),
      comentarios_cierre: comment,
      cerrado_a_tiempo: aTiempo,
      tiempo_vencido_mins: mins,
      updated_at: now.toISOString(),
    }).eq('id', closing.id)
    toast.success('Folio cerrado')
    setClosing(null)
    setComment('')
    setSaving(false)
    refetch()
  }

  async function handleAssign() {
    if (!assigning || !tecnico.trim()) return
    setSaving(true)
    await supabase.from('folios').update({
      tecnico_asignado: tecnico,
      updated_at: new Date().toISOString(),
    }).eq('id', assigning.id)
    toast.success('Tecnico asignado')
    setAssigning(null)
    setTecnico('')
    setSaving(false)
    refetch()
  }

  function getBorder(f: Folio) {
    const secs = (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000
    if (secs <= 0) return 'border-l-red-500'
    if (secs < 21600) return 'border-l-orange-400'
    return 'border-l-yellow-400'
  }

  function FolioCard({ f }: { f: Folio }) {
    const secs = (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000
    const isVencido = secs <= 0
    return (
      <div className={`card border-l-2 ${getBorder(f)} p-4 space-y-3`}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-dark-400">#{f.numero_folio}</span>
              <span className={`badge-${f.prioridad.toLowerCase()}`}>{f.prioridad}</span>
              <span className={isVencido ? 'badge-vencido' : 'badge-abierto'}>
                {isVencido ? 'VENCIDO' : 'ABIERTO'}
              </span>
            </div>
            <div className="font-semibold text-dark-100 mt-0.5">{f.tienda_nombre}</div>
            <div className="text-xs text-dark-400">{f.ciudad}</div>
            <div className="text-xs text-dark-400 mt-0.5">{f.falla || f.motivo}</div>
            {f.tecnico_asignado && (
              <div className="text-xs text-dark-500 mt-0.5">Tecnico: {f.tecnico_asignado}</div>
            )}
          </div>
          <div className="text-right">
            <Countdown fechaVencimiento={f.fecha_vencimiento} estatus={f.estatus} prioridad={f.prioridad} showBar />
            <div className="text-xs text-dark-500 mt-1">
              {format(new Date(f.fecha_vencimiento), 'HH:mm', { locale: es })}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setAssigning(f); setTecnico(f.tecnico_asignado || '') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <UserPlus size={12} /> Asignar
          </button>
          <button
            onClick={() => { setClosing(f); setComment('') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  function Section({ title, items, color }: { title: string; items: Folio[]; color: string }) {
    if (!items.length) return null
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wide">{title}</h3>
          <span className="text-xs text-dark-500">({items.length})</span>
        </div>
        <div className="space-y-3">
          {items.map(f => <FolioCard key={f.id} f={f} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
          <Clock size={18} className="text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Hoy se Vence</h1>
          <p className="text-dark-400 text-sm">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })} · {hoy.length} folios
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total hoy',   val: hoy.length,      color: 'text-white'      },
          { label: 'Vencidos',    val: vencidos.length, color: 'text-red-400'    },
          { label: 'Activos',     val: activos.length,  color: 'text-orange-400' },
          { label: 'Alta prior.', val: altas.length,    color: 'text-yellow-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card p-3 text-center">
            <div className={`text-2xl font-black ${color}`}>{val}</div>
            <div className="text-xs text-dark-500 mt-0.5 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      {hoy.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <div className="text-dark-300 font-medium">Sin vencimientos hoy</div>
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Vencidos hoy"    items={vencidos} color="bg-red-500"    />
          <Section title="Alta Prioridad"  items={altas}    color="bg-orange-400" />
          <Section title="Media Prioridad" items={medias}   color="bg-yellow-400" />
          <Section title="Baja Prioridad"  items={bajas}    color="bg-green-400"  />
        </div>
      )}

      {closing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Cerrar #{closing.numero_folio}</h3>
              <button onClick={() => setClosing(null)}>
                <X size={18} className="text-dark-400"/>
              </button>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Comentario de cierre..."
              className="input resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setClosing(null)} className="btn-ghost flex-1">Cancelar</button>
              <button
                onClick={handleClose}
                disabled={saving || !comment.trim()}
                className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {assigning && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Asignar Tecnico</h3>
              <button onClick={() => setAssigning(null)}>
                <X size={18} className="text-dark-400"/>
              </button>
            </div>
            <input
              value={tecnico}
              onChange={e => setTecnico(e.target.value)}
              placeholder="Nombre del tecnico"
              className="input mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setAssigning(null)} className="btn-ghost flex-1">Cancelar</button>
              <button
                onClick={handleAssign}
                disabled={saving || !tecnico.trim()}
                className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
