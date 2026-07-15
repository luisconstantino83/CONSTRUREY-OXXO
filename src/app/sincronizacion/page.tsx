"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { RefreshCw, Wifi, WifiOff, AlertTriangle } from "lucide-react"

interface SyncLog {
  id: string
  estado: string
  correos_procesados: number
  errores: number
  ultimo_evento: string | null
  fuente: string
  created_at: string
}

interface SyncStatus {
  estado: "activo" | "retraso" | "falla" | "sin_datos"
  ultimaSync: string | null
  minutosDesdeUltimaSync: number
  ultimoFolio: string | null
  ultimoCierre: string | null
  correosHoy: number
  erroresHoy: number
  historial: SyncLog[]
}

function calcularEstado(mins: number): "activo" | "retraso" | "falla" {
  if (mins < 15) return "activo"
  if (mins < 60) return "retraso"
  return "falla"
}

export default function SincronizacionPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function cargarEstado() {
    setRefreshing(true)
    try {
      const { data: logs } = await supabase
        .from("sync_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      const { data: ultimoFolioData } = await supabase
        .from("folios")
        .select("numero_folio, tienda_nombre, fecha_importacion")
        .order("fecha_importacion", { ascending: false })
        .limit(1)
        .single()

      const { data: ultimoCierreData } = await supabase
        .from("folios")
        .select("numero_folio, tienda_nombre, fecha_cierre")
        .not("fecha_cierre", "is", null)
        .order("fecha_cierre", { ascending: false })
        .limit(1)
        .single()

      const ultimoLog = logs?.[0]
      const ahora = new Date()
      const mins = ultimoLog
        ? Math.floor((ahora.getTime() - new Date(ultimoLog.created_at).getTime()) / 60000)
        : 999

      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const logsHoy = logs?.filter(l => new Date(l.created_at) >= hoy) || []
      const correosHoy = logsHoy.reduce((a, l) => a + (l.correos_procesados || 0), 0)
      const erroresHoy = logsHoy.reduce((a, l) => a + (l.errores || 0), 0)

      setStatus({
        estado: ultimoLog ? calcularEstado(mins) : "sin_datos",
        ultimaSync: ultimoLog?.created_at || null,
        minutosDesdeUltimaSync: mins,
        ultimoFolio: ultimoFolioData ? `#${ultimoFolioData.numero_folio} — ${ultimoFolioData.tienda_nombre}` : null,
        ultimoCierre: ultimoCierreData ? `#${ultimoCierreData.numero_folio} — ${ultimoCierreData.tienda_nombre}` : null,
        correosHoy,
        erroresHoy,
        historial: logs || [],
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    cargarEstado()
    const interval = setInterval(cargarEstado, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const estadoConfig = {
    activo: { icon: <Wifi size={20} className="text-green-400" />, label: "SINCRONIZACION ACTIVA", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", emoji: "🟢" },
    retraso: { icon: <AlertTriangle size={20} className="text-yellow-400" />, label: "POSIBLE RETRASO", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", emoji: "🟡" },
    falla: { icon: <WifiOff size={20} className="text-red-400" />, label: "SIN ACTIVIDAD — REVISAR CORREO", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", emoji: "🔴" },
    sin_datos: { icon: <AlertTriangle size={20} className="text-dark-400" />, label: "SIN DATOS AUN", color: "text-dark-400", bg: "bg-dark-800 border-dark-600", emoji: "⚪" },
  }

  const cfg = estadoConfig[status?.estado || "sin_datos"]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Estado de Sincronizacion</h1>
          <p className="text-dark-400 text-sm mt-0.5">Pipeline: Outlook → Gmail → Google Script → Supabase → App</p>
        </div>
        <button onClick={cargarEstado} disabled={refreshing} className="btn-ghost flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Verificar ahora
        </button>
      </div>

      <div className={`card p-5 border ${cfg.bg}`}>
        <div className="flex items-center gap-3 mb-3">
          {cfg.icon}
          <span className={`text-lg font-black ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
        </div>
        {status?.estado === "falla" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
            <p className="text-red-300 text-sm font-medium">🚨 POSIBLE FALLA EN EL REENVIO DE CORREOS</p>
            <p className="text-red-400 text-xs mt-1">Los correos pueden haber dejado de llegar a Gmail. La aplicacion podria estar desactualizada.</p>
            <p className="text-red-400 text-xs mt-1 font-medium">Accion: Ve a Outlook → Configuracion → Reenvio → Verifica que este activo.</p>
          </div>
        )}
        {status?.ultimaSync && (
          <p className="text-dark-400 text-sm mt-2">
            Ultima sincronizacion:{" "}
            <span className="text-dark-200">
              {formatDistanceToNow(new Date(status.ultimaSync), { addSuffix: true, locale: es })}
            </span>
            {" "}({format(new Date(status.ultimaSync), "dd/MM HH:mm")})
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-2xl font-black text-white">{status?.correosHoy || 0}</div>
          <div className="text-xs text-dark-400 mt-1 uppercase">Correos hoy</div>
        </div>
        <div className="card p-4">
          <div className={`text-2xl font-black ${(status?.erroresHoy || 0) > 0 ? "text-red-400" : "text-green-400"}`}>
            {status?.erroresHoy || 0}
          </div>
          <div className="text-xs text-dark-400 mt-1 uppercase">Errores hoy</div>
        </div>
        <div className="card p-4 sm:col-span-2">
          <div className="text-xs text-dark-500 uppercase mb-1">Ultimo folio recibido</div>
          <div className="text-sm text-dark-100 font-medium truncate">{status?.ultimoFolio || "—"}</div>
          <div className="text-xs text-dark-500 uppercase mb-1 mt-2">Ultimo cierre recibido</div>
          <div className="text-sm text-dark-100 font-medium truncate">{status?.ultimoCierre || "—"}</div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-3 uppercase tracking-wide">Historial de Sincronizacion</h3>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {status?.historial.length === 0 && (
            <p className="text-dark-500 text-sm text-center py-6">Sin registros aun</p>
          )}
          {status?.historial.map(log => (
            <div key={log.id} className="flex items-center gap-3 px-3 py-2 bg-dark-900 rounded-lg">
              <span className="text-xs w-3">
                {log.estado === "ok" ? "🟢" : log.estado === "sin_correos" ? "⚪" : log.estado === "posible_falla_reenvio" ? "🔴" : "🟡"}
              </span>
              <span className="text-xs text-dark-400 w-32 flex-shrink-0">
                {format(new Date(log.created_at), "dd/MM HH:mm:ss")}
              </span>
              <span className="text-xs text-dark-300 flex-1">{log.estado}</span>
              {log.correos_procesados > 0 && (
                <span className="text-xs text-green-400">{log.correos_procesados} correos</span>
              )}
              {log.errores > 0 && (
                <span className="text-xs text-red-400">{log.errores} errores</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
