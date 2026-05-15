'use client'
import { useState, useMemo } from 'react'
import { useFolios } from '@/hooks/useFolios'
import { useAuth } from '@/hooks/useAuth'
import { Countdown } from '@/components/ui/Countdown'
import { createClient } from '@/lib/supabase/client'
import { parseCorreo, calcularFechaVencimiento } from '@/lib/parser'
import { toast } from 'sonner'
import { Search, Mail, X, Trash2 } from 'lucide-react'
import type { Folio } from '@/types'
import { format } from 'date-fns'

export default function FoliosPage() {
  const { folios, loading, refetch } = useFolios()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const supabase = createClient()

  const [search, setSearch]         = useState('')
  const [fCiudad, setFCiudad]       = useState('Todas')
  const [fPrioridad, setFPrioridad] = useState('Todas')
  const [fEstatus, setFEstatus]     = useState('Todos')
  const [showImport, setShowImport] = useState(false)
  const [showDetail, setShowDetail] = useState<Folio | null>(null)
  const [emailText, setEmailText]   = useState('')
  const [importLoading, setImportLoading] = useState(false)

  const filtered = useMemo(() => {
    return [...folios]
      .filter(f => {
        if (fCiudad !== 'Todas' && f.ciudad !== fCiudad) return false
        if (fPrioridad !== 'Todas' && f.prioridad !== fPrioridad) return false
        if (fEstatus !== 'Todos' && f.estatus !== fEstatus) return false
        if (search) {
          const s = search.toLowerCase()
          return (
            f.numero_folio.includes(s) ||
            f.tienda_nombre.toLowerCase().includes(s) ||
            (f.falla || '').toLowerCase().includes(s) ||
            (f.id_tienda || '').toLowerCase().includes(s)
          )
        }
        return true
      })
      .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
  }, [folios, fCiudad, fPrioridad, fEstatus, search])

  async function handleImport() {
    if (!emailText.trim()) return
    setImportLoading(true)
    try {
      const parsed = parseCorreo(emailText)
      await supabase.from('correos_importados').insert({
        tipo: parsed.tipo, contenido: emailText, folio_detectado: parsed.ticket, procesado: false,
      })
      if (parsed.tipo === 'cierre') {
        const { data: existing } = await supabase
          .from('folios').select('id,fecha_vencimiento,estatus').eq('numero_folio', parsed.ticket!).single()
        if (existing) {
          const fechaCierre = parsed.fecha_correo ? new Date(parsed.fecha_correo) : new Date()
          const vencimiento = new Date(existing.fecha_vencimiento)
          const cerradoATiempo = fechaCierre <= vencimiento
          const tiempoVencidoMins = cerradoATiempo ? 0 : Math.floor((fechaCierre.getTime() - vencimiento.getTime()) / 60000)
          await supabase.from('folios').update({
            estatus: 'Cerrado', fecha_cierre: fechaCierre.toISOString(),
            comentarios_cierre: parsed.comentarios_cierre,
            nombre_persona_cierra: parsed.nombre_persona_cierra,
            cerrado_a_tiempo: cerradoATiempo,
            tiempo_vencido_mins: tiempoVencidoMins,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
          await supabase.from('correos_importados').update({ procesado: true, folio_id: existing.id, resultado: 'cerrado' }).eq('folio_detectado', parsed.ticket!)
          toast.success(`Folio #${parsed.ticket} cerrado ${cerradoATiempo ? '✅ a tiempo' : '⚠ con retraso'}`)
        } else {
          toast.warning(`Folio #${parsed.ticket} no encontrado. Guardado para conciliación.`)
        }
      } else if (parsed.tipo === 'apertura' && parsed.ticket) {
        const { data: dup } = await supabase.from('folios').select('id').eq('numero_folio', parsed.ticket).single()
        if (dup) { toast.warning(`El folio #${parsed.ticket} ya existe.`); setImportLoading(false); return }
        const fechaLlegada = parsed.fecha_correo ? new Date(parsed.fecha_correo) : new Date()
        const fechaVencimiento = calcularFechaVencimiento(parsed.prioridad || 'MEDIA', fechaLlegada)
        await supabase.from('folios').insert({
          numero_folio: parsed.ticket,
          id_tienda: parsed.id_tienda,
          tienda_nombre: parsed.tienda_nombre || 'Sin nombre',
          ciudad: parsed.ciudad || 'Reynosa',
          prioridad: parsed.prioridad || 'MEDIA',
          categoria: parsed.categoria,
          motivo: parsed.motivo,
          falla: parsed.motivo,
          falla_especifica: parsed.falla_especifica,
          representante_propietario: parsed.representante_propietario,
          prestador_servicio: parsed.prestador_servicio,
          fecha_vencimiento: fechaVencimiento.toISOString(),
          fecha_importacion: fechaLlegada.toISOString(),
          estatus: 'Abierto',
          correo_origen: emailText,
        })
        await supabase.from('correos_importados').update({ procesado: true, resultado: 'apertura_creada' }).eq('folio_detectado', parsed.ticket)
        toast.success(`Folio #${parsed.ticket} creado — ${parsed.prioridad} — Llegó: ${fechaLlegada.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`)
      } else {
        toast.error('No se pudo detectar el tipo de correo')
      }
      setEmailText(''); setShowImport(false); refetch()
    } catch (e) {
      toast.error('Error al procesar el correo')
    }
    setImportLoading(false)
  }

  async function closeFolio(folio: Folio) {
    const now = new Date()
    const vencimiento = new Date(folio.fecha_vencimiento)
    const cerradoATiempo = now <= vencimiento
    await supabase.from('folios').update({
      estatus: 'Cerrado', fecha_cierre: now.toISOString(),
      cerrado_a_tiempo: cerradoATiempo,
      tiempo_vencido_mins: cerradoATiempo ? 0 : Math.floor((now.getTime() - vencimiento.getTime()) / 60000),
      updated_at: now.toISOString(),
    }).eq('id', folio.id)
    toast.success(`Folio #${folio.numero_folio} cerrado`)
    setShowDetail(null)
  }

  async function deleteFolio(folio: Folio) {
    if (!confirm(`¿Eliminar folio #${folio.numero_folio}?\n\nEsta acción no se puede deshacer.`)) return
    await supabase.from('folios').delete().eq('id', folio.id)
    toast.success(`Folio #${folio.numero_folio} eliminado`)
    setShowDetail(null)
    refetch()
  }

  const fbtn = (active: boolean, onClick: () => void, label: string) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-brand-green/20 text-brand-green border border-brand-green/30' : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-200'}`}>
      {label}
    </button>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Folios</h1>
          <p className="text-dark-400 text-sm mt-0.5">{filtered.length} de {folios.length} folios</p>
        </div>
        <button onClick={() => setShowImport(true)} className="btn-primary flex items-center gap-2">
          <Mail size={15} /> Importar Correo
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por folio, tienda, falla…" className="input pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-dark-500 uppercase tracking-wide">Ciudad</span>
            {['Todas', 'Reynosa', 'Río Bravo'].map(v => fbtn(fCiudad === v, () => setFCiudad(v), v))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-dark-500 uppercase tracking-wide">Prioridad</span>
            {['Todas', 'ALTA', 'MEDIA', 'BAJA'].map(v => fbtn(fPrioridad === v, () => setFPrioridad(v), v))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-dark-500 uppercase tracking-wide">Estatus</span>
            {['Todos', 'Abierto', 'Vencido', 'Cerrado'].map(v => fbtn(fEstatus === v, () => setFEstatus(v), v))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => {
            const secs = Math.floor((new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000)
            const isVencido = f.estatus === 'Vencido' || secs <= 0
            const borderLeft = isVencido ? 'border-l-red-500' : f.prioridad === 'ALTA' ? 'border-l-orange-400' : f.prioridad === 'MEDIA' ? 'border-l-yellow-400' : 'border-l-blue-400'
            return (
              <div key={f.id} onClick={() => setShowDetail(f)}
                className={`card card-hover p-4 border-l-2 ${borderLeft}`}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-dark-400">#{f.numero_folio}</span>
                      <span className={`badge-${f.prioridad.toLowerCase()}`}>{f.prioridad}</span>
                      <span className={`badge-${isVencido ? 'vencido' : f.estatus.toLowerCase()}`}>{isVencido && f.estatus !== 'Vencido' ? 'VENCIDO' : f.estatus}</span>
                      {f.id_tienda && <span className="text-xs text-dark-500">{f.id_tienda}</span>}
                    </div>
                    <div className="font-semibold text-dark-100 text-sm truncate">{f.tienda_nombre}</div>
                    <div className="text-xs text-dark-400 mt-0.5 truncate">{f.falla || f.motivo}</div>
                    <div className="text-xs text-dark-500 mt-0.5">{f.ciudad}{f.categoria && ` · ${f.categoria}`}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Countdown fechaVencimiento={f.fecha_vencimiento} estatus={isVencido ? 'Vencido' : f.estatus} prioridad={f.prioridad} showBar />
                    {f.fecha_importacion && (
                      <div className="text-xs text-dark-500 mt-1">Llegó: {format(new Date(f.fecha_importacion), 'dd/MM HH:mm')}</div>
                    )}
                    {f.fecha_cierre && (
                      <div className="text-xs text-dark-500 mt-1">{f.cerrado_a_tiempo ? '✅' : '⚠'} {format(new Date(f.fecha_cierre), 'dd/MM HH:mm')}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-dark-400 text-sm">Sin folios con estos filtros</p>
            </div>
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-lg p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Importar Correo OXXO</h3>
              <button onClick={() => setShowImport(false)} className="text-dark-400 hover:text-white"><X size={20}/></button>
            </div>
            <p className="text-dark-400 text-sm mb-1">Pega el correo completo incluyendo la fecha del encabezado.</p>
            <p className="text-dark-500 text-xs mb-3">Ejemplo: <span className="font-mono text-dark-400">viernes, 15 de mayo, 11:49 a.m.</span></p>
            <textarea value={emailText} onChange={e => setEmailText(e.target.value)}
              rows={10} className="input resize-none font-mono text-xs leading-relaxed"
              placeholder="viernes, 15 de mayo, 11:49 a.m.&#10;&#10;Buen día, La tienda OXXO..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowImport(false)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={handleImport} disabled={importLoading || !emailText.trim()} className="btn-primary flex-1 disabled:opacity-50">
                {importLoading ? 'Procesando...' : '✦ Procesar Correo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-dark-400">#{showDetail.numero_folio}</span>
                  <span className={`badge-${showDetail.prioridad.toLowerCase()}`}>{showDetail.prioridad}</span>
                  <span className={`badge-${showDetail.estatus.toLowerCase()}`}>{showDetail.estatus}</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">{showDetail.tienda_nombre}</h3>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-dark-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['ID Tienda',     showDetail.id_tienda],
                  ['Ciudad',        showDetail.ciudad],
                  ['Categoría',     showDetail.categoria],
                  ['Motivo',        showDetail.motivo],
                  ['Representante', showDetail.representante_propietario],
                  ['Prestador',     showDetail.prestador_servicio],
                  ['Técnico',       showDetail.tecnico_asignado || '—'],
                  ['Llegada',       showDetail.fecha_importacion ? format(new Date(showDetail.fecha_importacion),'dd/MM/yyyy HH:mm') : '—'],
                  ['Vencimiento',   format(new Date(showDetail.fecha_vencimiento),'dd/MM/yyyy HH:mm')],
                  ['Cerrado',       showDetail.fecha_cierre ? format(new Date(showDetail.fecha_cierre),'dd/MM/yyyy HH:mm') : '—'],
                  ['A tiempo',      showDetail.cerrado_a_tiempo === true ? '✅ Sí' : showDetail.cerrado_a_tiempo === false ? `⚠ No (+${showDetail.tiempo_vencido_mins}m)` : '—'],
                ].map(([k,v]) => v ? (
                  <div key={k as string} className="bg-dark-900 rounded-lg p-3">
                    <div className="text-xs text-dark-500 uppercase tracking-wide mb-1">{k}</div>
                    <div className="text-sm text-dark-100">{v}</div>
                  </div>
                ) : null)}
              </div>
              {showDetail.estatus !== 'Cerrado' && (
                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="text-xs text-dark-500 uppercase tracking-wide mb-2">Tiempo Restante</div>
                  <Countdown fechaVencimiento={showDetail.fecha_vencimiento} estatus={showDetail.estatus} prioridad={showDetail.prioridad} showBar />
                </div>
              )}
              {showDetail.falla_especifica && (
                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="text-xs text-dark-500 uppercase tracking-wide mb-1">Falla Específica</div>
                  <div className="text-sm text-dark-100">{showDetail.falla_especifica}</div>
                </div>
              )}
              {showDetail.correo_origen && (
                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="text-xs text-dark-500 uppercase tracking-wide mb-1">Correo Original</div>
                  <pre className="text-xs text-dark-300 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">{showDetail.correo_origen}</pre>
                </div>
              )}
              {showDetail.comentarios_cierre && (
                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="text-xs text-dark-500 uppercase tracking-wide mb-1">Comentarios Cierre</div>
                  <div className="text-sm text-dark-200">{showDetail.comentarios_cierre}</div>
                </div>
              )}
              <div className="flex flex-col gap-2 mt-2">
                {showDetail.estatus !== 'Cerrado' && (
                  <button onClick={() => closeFolio(showDetail)} className="btn-primary w-full">
                    ✓ Cerrar Folio Manualmente
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => deleteFolio(showDetail)} className="btn-danger w-full flex items-center justify-center gap-2">
                    <Trash2 size={14}/> Eliminar Folio
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
