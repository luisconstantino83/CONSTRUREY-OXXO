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
    await supabase.from('folios').update({
      estatus: 'Cerrado',
      fecha_cierre: now.toISOString(),
      comentarios_cierre: comment,
      cerrado_a_tiempo: aTiempo,
      tiempo_vencido_mins: aTiempo ? 0 : Math.floor((now.getTime() - venc.getTime()) /
