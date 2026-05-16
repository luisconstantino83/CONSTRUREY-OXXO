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
        return isToday(venc) || (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000 <= 0
      })
      .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
  }, [folios])

  const vencidos = hoy.filter(f => (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000 <= 0)
  const activos  = hoy.filter(f => (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000 > 0)
  const altas    = activos.filter(f => f.prioridad === '
