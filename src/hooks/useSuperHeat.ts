'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SuperHeat } from '@/types'

export function useSuperHeat() {
  const [items, setItems]     = useState<SuperHeat[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('super_heat')
      .select('*')
      .order('tienda_nombre')
    if (data) setItems(data as SuperHeat[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetch()
    const ch = supabase
      .channel('superheat-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super_heat' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetch, supabase])

  const realizados  = items.filter(i => i.estatus === 'realizado').length
  const pendientes  = items.filter(i => i.estatus === 'pendiente').length
  const programados = items.filter(i => i.estatus === 'programado').length
  const pct = items.length > 0 ? Math.round((realizados / items.length) * 100) : 0

  return { items, loading, realizados, pendientes, programados, pct, refetch: fetch }
}
