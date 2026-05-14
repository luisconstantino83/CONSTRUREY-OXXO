'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Folio, DashboardStats } from '@/types'

export function useFolios() {
  const [folios, setFolios]   = useState<Folio[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchFolios = useCallback(async () => {
    const { data } = await supabase
      .from('folios')
      .select('*')
      .order('fecha_vencimiento', { ascending: true })
    if (data) setFolios(data as Folio[])
    setLoading(false)
  }, [supabase])

  // Auto-mark vencidos every minute
  useEffect(() => {
    const tick = setInterval(async () => {
      const now = new Date().toISOString()
      await supabase
        .from('folios')
        .update({ estatus: 'Vencido', updated_at: now })
        .eq('estatus', 'Abierto')
        .lt('fecha_vencimiento', now)
    }, 60000)
    return () => clearInterval(tick)
  }, [supabase])

  // Realtime subscription
  useEffect(() => {
    fetchFolios()
    const channel = supabase
      .channel('folios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folios' }, () => {
        fetchFolios()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchFolios, supabase])

  const stats: DashboardStats = {
    total:          folios.length,
    abiertos:       folios.filter(f => f.estatus === 'Abierto').length,
    cerrados:       folios.filter(f => f.estatus === 'Cerrado').length,
    vencidos:       folios.filter(f => f.estatus === 'Vencido').length,
    altas:          folios.filter(f => f.prioridad === 'ALTA' && f.estatus !== 'Cerrado').length,
    medias:         folios.filter(f => f.prioridad === 'MEDIA' && f.estatus !== 'Cerrado').length,
    bajas:          folios.filter(f => f.prioridad === 'BAJA' && f.estatus !== 'Cerrado').length,
    proximosVencer: folios.filter(f => {
      if (f.estatus !== 'Abierto') return false
      const secs = (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000
      return secs > 0 && secs < 21600 // less than 6h
    }).length,
  }

  return { folios, loading, stats, refetch: fetchFolios }
}
