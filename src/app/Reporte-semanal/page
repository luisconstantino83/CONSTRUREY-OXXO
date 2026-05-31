"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns"
import { es } from "date-fns/locale"
import { Download } from "lucide-react"
import { toast } from "sonner"
import type { Folio } from "@/types"

export default function ReporteSemanalPage() {
  const [folios, setFolios] = useState<Folio[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const now = new Date()
  const semanaActual = {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 })
  }
  const semanaPasada = {
    start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
    end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  }

  useEffect(() => {
    supabase
      .from("folios")
      .select("*")
      .not("numero_folio", "like", "TEMP-%")
      .gte("fecha_importacion", semanaPasada.start.toISOString())
      .order("fecha_importacion", { ascending: false })
      .then(({ data }) => {
        if (data) setFolios(data as Folio[])
        setLoading(false)
      })
  }, [supabase])

  const foliosSemana = folios.filter(f =>
    new Date(f.fecha_importacion) >= semanaActual.start &&
    new Date(f.fecha_importacion) <= semanaActual.end
  )

  const cerradosSemana = foliosSemana.filter(f => f.estatus === "Cerrado")
  const cerradosATiempo = cerradosSemana.filter(f => f.cerrado_a_tiempo === true).length
  const cumplimiento = cerradosSemana.length > 0
    ? Math.round((cerradosATiempo / cerradosSemana.length) * 100) : 0

  const altasSemana = foliosSemana.filter(f => f.prioridad === "ALTA")
  const mediasSemana = foliosSemana.filter(f => f.prioridad === "MEDIA")
  const bajasSemana = foliosSemana.filter(f => f.prioridad === "BAJA")

  const reynosaSemana = foliosSemana.filter(f => f.ciudad === "Reynosa")
  const rioBravoSemana = foliosSemana.filter(f => f.ciudad === "Rio Bravo")

  const tiendaCount: Record<string, number> = {}
  foliosSemana.forEach(f => {
    tiendaCount[f.tienda_nombre] = (tiendaCount[f.tienda_nombre] || 0) + 1
  })
  const topTiendas = Object.entries(tiendaCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const catCount: Record<string, number> = {}
  foliosSemana.forEach(f => {
    const c = f.categoria || "Otro"
    catCount[c] = (catCount[c] || 0) + 1
  })
  const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reporte Semanal</h1>
          <p className="text-dark-400 text-sm mt-1">
            {format(semanaActual.start, "dd MMM", { locale: es })} — {format(semanaActual.end, "dd MMM yyyy", { locale: es })}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Folios Semana",    val: foliosSemana.length,   color: "text-white" },
          { label: "Cerrados",         val: cerradosSemana.length, color: "text-green-400" },
          { label: "% Cumplimiento",   val: `${cumplimiento}%`,    color: cumplimiento >= 80 ? "text-green-400" : cumplimiento >= 50 ? "text-yellow-400" : "text-red-400" },
          { label: "A Tiempo",         val: cerradosATiempo,       color: "text-brand-green" },
        ].map(({ label, val, color }) => (
          <div key={label} className="card p-4">
            <div className={`text-3xl font-black ${color}`}>{val}</div>
            <div className="text-xs text-dark-400 mt-1 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      {/* Por prioridad y ciudad */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-dark-400 uppercase mb-3">Por Prioridad</h3>
          <div className="space-y-2">
            {[
              { label: "ALTA",  val: altasSemana.length,   color: "text-orange-400", bg: "bg-orange-500/20" },
              { label: "MEDIA", val: mediasSemana.length,  color: "text-yellow-400", bg: "bg-yellow-500/20" },
              { label: "BAJA",  val: bajasSemana.length,   color: "text-blue-400",   bg: "bg-blue-500/20" },
            ].map(({ label, val, color, bg }) => (
              <div key={label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}>
                <span className="text-xs font-medium text-dark-300">{label}</span>
                <span className={`text-lg font-black ${color}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-dark-400 uppercase mb-3">Por Ciudad</h3>
          <div className="space-y-2">
            {[
              { label: "Reynosa",   val: reynosaSemana.length,  color: "text-white",   bg: "bg-dark-700" },
              { label: "Rio Bravo", val: rioBravoSemana.length, color: "text-blue-400", bg: "bg-blue-500/20" },
            ].map(({ label, val, color, bg }) => (
              <div key={label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}>
                <span className="text-xs font-medium text-dark-300">{label}</span>
                <span className={`text-lg font-black ${color}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top tiendas */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">🏪 Top Tiendas</h3>
        <div className="space-y-2">
          {topTiendas.map(([tienda, count], i) => (
            <div key={tienda} className="flex items-center gap-3">
              <span className="text-xs text-dark-500 w-5 text-right">#{i+1}</span>
              <div className="flex-1 bg-dark-900 rounded-lg overflow-hidden">
                <div className="h-7 flex items-center"
                  style={{ width: `${Math.round(count / topTiendas[0][1] * 100)}%`, minWidth: "3rem" }}>
                  <div className="h-full w-full bg-red-500/20 border-r border-red-500/30 flex items-center px-3">
                    <span className="text-xs text-dark-200 truncate font-medium">{tienda}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-red-400 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top categorias */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">📂 Top Categorías</h3>
        <div className="space-y-2">
          {topCats.map(([cat, count], i) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-xs text-dark-500 w-5 text-right">#{i+1}</span>
              <div className="flex-1 bg-dark-900 rounded-lg overflow-hidden">
                <div className="h-7 flex items-center"
                  style={{ width: `${Math.round(count / topCats[0][1] * 100)}%`, minWidth: "3rem" }}>
                  <div className="h-full w-full bg-blue-500/20 border-r border-blue-500/30 flex items-center px-3">
                    <span className="text-xs text-dark-200 truncate font-medium">{cat}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-400 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Folios abiertos actualmente */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-dark-200 mb-4 uppercase tracking-wide">📋 Folios de la Semana</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {foliosSemana.map(f => (
            <div key={f.id} className="flex items-center gap-3 px-3 py-2 bg-dark-900 rounded-lg">
              <span className="font-mono text-xs text-dark-400 w-20 flex-shrink-0">#{f.numero_folio}</span>
              <span className={`badge-${f.prioridad.toLowerCase()} flex-shrink-0`}>{f.prioridad}</span>
              <span className="text-sm text-dark-200 flex-1 truncate">{f.tienda_nombre}</span>
              <span className={`text-xs flex-shrink-0 ${f.estatus === "Cerrado" ? "text-green-400" : f.estatus === "Vencido" ? "text-red-400" : "text-yellow-400"}`}>
                {f.estatus}
              </span>
            </div>
          ))}
          {foliosSemana.length === 0 && (
            <p className="text-dark-500 text-sm text-center py-6">Sin folios esta semana</p>
          )}
        </div>
      </div>
    </div>
  )
}
