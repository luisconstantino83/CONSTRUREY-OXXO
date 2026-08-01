"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

export interface Folio {
  id: string
  numero_folio: string
  tienda_nombre: string
  ciudad: string
  prioridad: string
  categoria: string
  motivo: string
  falla: string
  fecha_importacion: string
  fecha_vencimiento: string
  estatus: string
  fecha_cierre: string | null
  cerrado_a_tiempo: boolean | null
  comentarios_cierre: string | null
  correo_origen: string | null
  updated_at: string
  lote_importacion: string | null
}

export interface DashboardStats {
  total: number
  abiertos: number
  cerrados: number
  vencidos: number
  vencidosActivos: number
  vencidosHistoricos: number
  altas: number
  medias: number
  bajas: number
  proximosVencer: number
}

function getClasificacion(folio: Folio): "EN_TIEMPO" | "VENCIDO_ACTIVO" | "VENCIDO_HISTORICO" | "CERRADO" {
  if (folio.estatus === "Cerrado") return "CERRADO"
  const ahora = new Date()
  const vencimiento = new Date(folio.fecha_vencimiento)
  if (vencimiento > ahora) return "EN_TIEMPO"
  // Comparar mes y año en zona horaria Reynosa (UTC-6)
  const ahoraLocal = new Date(ahora.toLocaleString("en-US", { timeZone: "America/Matamoros" }))
  const vencLocal = new Date(vencimiento.toLocaleString("en-US", { timeZone: "America/Matamoros" }))
  const mismoMes = vencLocal.getMonth() === ahoraLocal.getMonth() &&
                   vencLocal.getFullYear() === ahoraLocal.getFullYear()
  return mismoMes ? "VENCIDO_ACTIVO" : "VENCIDO_HISTORICO"
}

export function isVencidoNow(f: Folio): boolean {
  if (f.estatus === "Cerrado") return false
  return new Date(f.fecha_vencimiento).getTime() < Date.now()
}

export function useFolios() {
  const [folios, setFolios] = useState<Folio[]>([])
  const [totalCerrados, setTotalCerrados] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchFolios = useCallback(async () => {
    const { data } = await supabase
      .from("folios")
      .select("*")
      .not("estatus", "eq", "Cerrado")
      .not("numero_folio", "like", "TEMP-%")
      .order("fecha_vencimiento", { ascending: true })
      .limit(500)

    if (data) setFolios(data as Folio[])

    const { count } = await supabase
      .from("folios")
      .select("*", { count: "exact", head: true })
      .eq("estatus", "Cerrado")

    setTotalCerrados(count || 0)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const interval = setInterval(() => { fetchFolios() }, 30000)
    return () => clearInterval(interval)
  }, [fetchFolios])

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

  const vencidosActivos = folios.filter(f => getClasificacion(f) === "VENCIDO_ACTIVO")
  const vencidosHistoricos = folios.filter(f => getClasificacion(f) === "VENCIDO_HISTORICO")
  const enTiempo = folios.filter(f => getClasificacion(f) === "EN_TIEMPO")

  const stats: DashboardStats = {
    total:             folios.length + totalCerrados,
    abiertos:          enTiempo.length,
    cerrados:          totalCerrados,
    vencidos:          vencidosActivos.length + vencidosHistoricos.length,
    vencidosActivos:   vencidosActivos.length,
    vencidosHistoricos: vencidosHistoricos.length,
    altas:             enTiempo.filter(f => f.prioridad === "ALTA").length,
    medias:            enTiempo.filter(f => f.prioridad === "MEDIA").length,
    bajas:             enTiempo.filter(f => f.prioridad === "BAJA").length,
    proximosVencer:    enTiempo.filter(f => {
      const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
      return secs > 0 && secs < 21600
    }).length,
  }

  return {
    folios,
    loading,
    stats,
    isVencidoNow,
    getClasificacion,
    vencidosActivos,
    vencidosHistoricos,
    enTiempo,
    refetch: fetchFolios,
  }
}
