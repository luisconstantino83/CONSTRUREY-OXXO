'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, X, Users } from 'lucide-react'
import type { Tecnico } from '@/types'

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', cuadrilla: '', telefono: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function fetch() {
    const { data } = await supabase.from('tecnicos').select('*').order('nombre')
    if (data) setTecnicos(data as Tecnico[])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  async function save() {
    if (!form.nombre.trim()) return
    setSaving(true)
    const { error } = await supabase.from('tecnicos').insert({
      nombre: form.nombre, cuadrilla: form.cuadrilla, telefono: form.telefono, activo: true,
    })
    if (error) toast.error('Error al guardar')
    else { toast.success('Técnico agregado'); setForm({ nombre: '', cuadrilla: '', telefono: '' }); setShowForm(false); fetch() }
    setSaving(false)
  }

  async function toggle(t: Tecnico) {
    await supabase.from('tecnicos').update({ activo: !t.activo }).eq('id', t.id)
    fetch()
  }

  // Group by cuadrilla
  const groups: Record<string, Tecnico[]> = {}
  tecnicos.forEach(t => {
    const g = t.cuadrilla || 'Sin cuadrilla'
    if (!groups[g]) groups[g] = []
    groups[g].push(t)
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Técnicos</h1>
          <p className="text-dark-400 text-sm mt-0.5">{tecnicos.filter(t => t.activo).length} activos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Agregar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        Object.entries(groups).map(([grupo, tecs]) => (
          <div key={grupo} className="card p-5">
            <h3 className="text-sm font-semibold text-dark-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
              <Users size={15} className="text-brand-green" /> {grupo}
              <span className="text-dark-500 font-normal normal-case">({tecs.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tecs.map(t => (
                <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${t.activo ? 'border-dark-600 bg-dark-900/50' : 'border-dark-700 bg-dark-900/20 opacity-50'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.activo ? 'bg-brand-green/20' : 'bg-dark-700'}`}>
                    <span className={`text-xs font-bold ${t.activo ? 'text-brand-green' : 'text-dark-400'}`}>
                      {t.nombre[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-dark-100 truncate">{t.nombre}</div>
                    {t.telefono && <div className="text-xs text-dark-500">{t.telefono}</div>}
                  </div>
                  <button onClick={() => toggle(t)}
                    className={`text-xs px-2 py-1 rounded border transition-all ${t.activo ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-dark-600 text-dark-500 hover:text-dark-300'}`}>
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {Object.keys(groups).length === 0 && !loading && (
        <div className="card p-12 text-center">
          <Users size={32} className="text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">Sin técnicos registrados</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Agregar técnico</button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-md animate-slide-up p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Nuevo Técnico</h3>
              <button onClick={() => setShowForm(false)} className="text-dark-400 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-dark-400 uppercase tracking-wide block mb-1.5">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} className="input" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="text-xs text-dark-400 uppercase tracking-wide block mb-1.5">Cuadrilla</label>
                <input value={form.cuadrilla} onChange={e => setForm(f => ({...f, cuadrilla: e.target.value}))} className="input" placeholder="Cuadrilla A, B, C..." />
              </div>
              <div>
                <label className="text-xs text-dark-400 uppercase tracking-wide block mb-1.5">Teléfono</label>
                <input value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))} className="input" placeholder="899-000-0000" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={save} disabled={saving || !form.nombre.trim()} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
