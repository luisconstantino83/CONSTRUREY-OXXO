"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Folio, DashboardStats } from "@/types"

export function isVencidoNow(f: Folio): boolean {
  if (f.estatus === "Cerrado") return false
  return new Date(f.fecha_vencimiento).getTime() < Date.now()
}

export function useFolios() {
  const [folios, setFolios] = useState<Folio[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchFolios = useCallback(async () => {
    const { data } = await supabase
      .from("folios")
      .select("*")
      .not("estatus", "eq", "Cerrado")
      .not("numero_folio", "like", "TEMP-%")
      .order("fecha_vencimiento", { ascending: true })
      .limit(150)
    if (data) setFolios(data as Folio[])
    setLoading(false)
  }, [supabase])

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFolios()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchFolios])

  // Realtime — una sola suscripcion
  useEffect(() => {
    fetchFolios()
    const channel = supabase
      .channel("folios-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "folios" }, () => {
        fetchFolios()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchFolios, supabase])

  const now = Date.now()

  const stats: DashboardStats = {
    total:          folios.length,
    abiertos:       folios.filter(f => f.estatus !== "Cerrado").length,
    cerrados:       folios.filter(f => f.estatus === "Cerrado").length,
    vencidos:       folios.filter(f => new Date(f.fecha_vencimiento).getTime() < now).length,
    altas:          folios.filter(f => f.prioridad === "ALTA").length,
    medias:         folios.filter(f => f.prioridad === "MEDIA").length,
    bajas:          folios.filter(f => f.prioridad === "BAJA").length,
    proximosVencer: folios.filter(f => {
      const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
      return secs > 0 && secs < 21600
    }).length,
  }

  return { folios, loading, stats, isVencidoNow, refetch: fetchFolios }
}
