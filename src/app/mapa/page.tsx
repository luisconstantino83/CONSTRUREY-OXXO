"use client"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { MapPin, Filter } from "lucide-react"
import dynamic from "next/dynamic"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false })

const TIENDAS = [
  { cr: "50JEV", nombre: "AGUSTIN LARA", ciudad: "Reynosa", lat: 26.065, lng: -98.29 },
  { cr: "50BTH", nombre: "BEETHOVEN", ciudad: "Reynosa", lat: 26.064, lng: -98.289 },
  { cr: "50SWE", nombre: "DOCTORES", ciudad: "Reynosa", lat: 26.075, lng: -98.28 },
  { cr: "50CJT", nombre: "ELIAS PINA", ciudad: "Reynosa", lat: 26.072, lng: -98.275 },
  { cr: "50OFF", nombre: "FUENTES", ciudad: "Reynosa", lat: 26.09, lng: -98.27 },
  { cr: "508KH", nombre: "GENERAL ALVARO", ciudad: "Reynosa", lat: 26.06, lng: -98.265 },
  { cr: "50GNB", nombre: "AEROPUERTO", ciudad: "Reynosa", lat: 26.02, lng: -98.228 },
  { cr: "50JHS", nombre: "UNIV TECNOLOGICA", ciudad: "Reynosa", lat: 26.015, lng: -98.235 },
  { cr: "50BZD", nombre: "LOPEZ PORTILLO", ciudad: "Reynosa", lat: 26.095, lng: -98.26 },
  { cr: "50LHV", nombre: "PETROLERA", ciudad: "Reynosa", lat: 26.07, lng: -98.25 },
  { cr: "5059A", nombre: "UNIDAD OBRERA", ciudad: "Reynosa", lat: 26.068, lng: -98.255 },
  { cr: "50FDJ", nombre: "LAMPACITOS", ciudad: "Reynosa", lat: 26.067, lng: -98.253 },
  { cr: "50EHO", nombre: "DELICIAS", ciudad: "Reynosa", lat: 26.055, lng: -98.248 },
  { cr: "50EPW", nombre: "ESPUELA", ciudad: "Reynosa", lat: 26.072, lng: -98.249 },
  { cr: "50UGR", nombre: "ALMAGUER", ciudad: "Reynosa", lat: 26.076, lng: -98.27 },
  { cr: "50WFW", nombre: "TOTECO", ciudad: "Reynosa", lat: 26.069, lng: -98.251 },
  { cr: "50WLJ", nombre: "GENERAL RODRIGUEZ", ciudad: "Reynosa", lat: 26.074, lng: -98.252 },
  { cr: "50ZZS", nombre: "ZACATECAS", ciudad: "Reynosa", lat: 26.066, lng: -98.256 },
  { cr: "50BRM", nombre: "ALMENDROS", ciudad: "Reynosa", lat: 26.048, lng: -98.242 },
  { cr: "50LKI", nombre: "BALCONES DE ALCALA", ciudad: "Reynosa", lat: 26.04, lng: -98.238 },
  { cr: "50YBK", nombre: "LAUREL", ciudad: "Reynosa", lat: 26.042, lng: -98.236 },
  { cr: "50ZLT", nombre: "LATON", ciudad: "Reynosa", lat: 26.046, lng: -98.24 },
  { cr: "50ZZJ", nombre: "CHAPULTEPEC", ciudad: "Reynosa", lat: 26.085, lng: -98.265 },
  { cr: "50ZZH", nombre: "CAMPANARIO", ciudad: "Reynosa", lat: 26.086, lng: -98.266 },
  { cr: "50ZZR", nombre: "MAQUILADORAS", ciudad: "Reynosa", lat: 26.088, lng: -98.268 },
  { cr: "50BIX", nombre: "CAMPO MILITAR", ciudad: "Reynosa", lat: 26.018, lng: -98.23 },
  { cr: "50HTL", nombre: "JACALITOS", ciudad: "Reynosa", lat: 26.01, lng: -98.22 },
  { cr: "50LLL", nombre: "LAS TORRES", ciudad: "Reynosa", lat: 26.055, lng: -98.252 },
  { cr: "500ER", nombre: "TAMAULIPAS", ciudad: "Reynosa", lat: 26.058, lng: -98.258 },
  { cr: "50ZPS", nombre: "LA PRESA", ciudad: "Reynosa", lat: 26.056, lng: -98.256 },
  { cr: "50IDL", nombre: "IDEAL", ciudad: "Reynosa", lat: 26.052, lng: -98.254 },
  { cr: "50QSO", nombre: "COLOSIO", ciudad: "Reynosa", lat: 26.05, lng: -98.258 },
  { cr: "50VYO", nombre: "BENITO JUAREZ", ciudad: "Reynosa", lat: 26.048, lng: -98.256 },
  { cr: "50FKH", nombre: "HEROES DE LA REFORMA", ciudad: "Reynosa", lat: 26.046, lng: -98.254 },
  { cr: "500GN", nombre: "FCO NICODEMO", ciudad: "Reynosa", lat: 26.015, lng: -98.24 },
  { cr: "50JNO", nombre: "JARACHINA NTE", ciudad: "Reynosa", lat: 26.1, lng: -98.275 },
  { cr: "50AVB", nombre: "MODULO 2000", ciudad: "Reynosa", lat: 26.08, lng: -98.28 },
  { cr: "505BX", nombre: "NOVENA", ciudad: "Reynosa", lat: 26.09, lng: -98.272 },
  { cr: "50TEF", nombre: "ORIENTE 2", ciudad: "Reynosa", lat: 26.092, lng: -98.274 },
  { cr: "50PEK", nombre: "PEKIN", ciudad: "Reynosa", lat: 26.088, lng: -98.276 },
  { cr: "50I65", nombre: "COMETA", ciudad: "Rio Bravo", lat: 26.02, lng: -98.1 },
  { cr: "50KC6", nombre: "ALLENDE", ciudad: "Rio Bravo", lat: 26.015, lng: -98.095 },
  { cr: "50PIQ", nombre: "PIRUL", ciudad: "Rio Bravo", lat: 26.018, lng: -98.098 },
  { cr: "506PN", nombre: "BRECHA 108", ciudad: "Rio Bravo", lat: 26.022, lng: -98.102 },
  { cr: "50BSH", nombre: "BRECHA", ciudad: "Rio Bravo", lat: 26.023, lng: -98.103 },
  { cr: "50W87", nombre: "AZTECA", ciudad: "Rio Bravo", lat: 26.024, lng: -98.104 },
  { cr: "50RGJ", nombre: "GUANAJUATO", ciudad: "Rio Bravo", lat: 26.026, lng: -98.106 },
  { cr: "50WTG", nombre: "COAHUILA", ciudad: "Rio Bravo", lat: 26.025, lng: -98.105 },
  { cr: "50NAK", nombre: "YUCATAN", ciudad: "Rio Bravo", lat: 26.019, lng: -98.097 },
  { cr: "50NPR", nombre: "NUEVO PROGRESO", ciudad: "Rio Bravo", lat: 26.065, lng: -97.95 },
  { cr: "50NPS", nombre: "NUEVO PROGRESO II", ciudad: "Rio Bravo", lat: 26.066, lng: -97.949 },
  { cr: "50OCW", nombre: "OCEANO ATLANTICO", ciudad: "Rio Bravo", lat: 26.021, lng: -98.101 },
  { cr: "50CIF", nombre: "COLEGIO MILITAR", ciudad: "Rio Bravo", lat: 26.005, lng: -98.09 },
  { cr: "50JGG", nombre: "JALAPA", ciudad: "Rio Bravo", lat: 26.002, lng: -98.088 },
  { cr: "50LB0", nombre: "CENTRAL RIO BRAVO", ciudad: "Rio Bravo", lat: 26.003, lng: -98.087 },
  { cr: "50B19", nombre: "16 DE SEPTIEMBRE", ciudad: "Rio Bravo", lat: 26.004, lng: -98.086 },
  { cr: "50C35", nombre: "SUR 2", ciudad: "Rio Bravo", lat: 26.006, lng: -98.091 },
  { cr: "50L2O", nombre: "ALAMO", ciudad: "Rio Bravo", lat: 26.01, lng: -98.095 },
  { cr: "502Y6", nombre: "CONQUISTADORES", ciudad: "Rio Bravo", lat: 26.012, lng: -98.093 },
  { cr: "50CXQ", nombre: "CUAUHTEMOC", ciudad: "Rio Bravo", lat: 26.008, lng: -98.092 },
  { cr: "50DMQ", nombre: "DEL RIO", ciudad: "Rio Bravo", lat: 26.007, lng: -98.091 },
  { cr: "50RLA", nombre: "AMERICAS", ciudad: "Rio Bravo", lat: 26.009, lng: -98.094 },
  { cr: "50RRF", nombre: "SANTA FE", ciudad: "Rio Bravo", lat: 26.011, lng: -98.096 },
  { cr: "50V4X", nombre: "MATAMOROS", ciudad: "Rio Bravo", lat: 26.013, lng: -98.097 },
  { cr: "50XIU", nombre: "GUERRERO", ciudad: "Rio Bravo", lat: 26.014, lng: -98.098 },
  { cr: "507UA", nombre: "TLAXCALA", ciudad: "Rio Bravo", lat: 26.016, lng: -98.099 },
  { cr: "50BCY", nombre: "BRISAS DEL CAMPO", ciudad: "Rio Bravo", lat: 26.017, lng: -98.1 },
  { cr: "50M80", nombre: "FRANCISCO I. MADERO", ciudad: "Rio Bravo", lat: 26.005, lng: -98.089 },
  { cr: "50K8S", nombre: "LAS LIEBRES", ciudad: "Rio Bravo", lat: 26.003, lng: -98.085 },
  { cr: "5073P", nombre: "ABASOLO", ciudad: "Rio Bravo", lat: 26.001, lng: -98.084 },
  { cr: "502TV", nombre: "GAS VALEO", ciudad: "Rio Bravo", lat: 26.002, lng: -98.086 },
]

interface Folio {
  id: string
  tienda_nombre: string
  prioridad: string
  estatus: string
  numero_folio: string
}

export default function MapaPage() {
  const supabase = createClient()
  const [folios, setFolios] = useState<Folio[]>([])
  const [fCiudad, setFCiudad] = useState("todas")
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    supabase.from("folios").select("id,tienda_nombre,prioridad,estatus,numero_folio")
      .neq("estatus", "Cerrado").then(({ data }) => { if (data) setFolios(data) })
    setMapReady(true)
  }, [supabase])

  const folioMap = useMemo(() => {
    const m: Record<string, Folio[]> = {}
    folios.forEach(f => {
      const key = f.tienda_nombre.toLowerCase().replace(/oxxo\s*/i, "").replace(/\s*rex\s*/i, "").trim()
      if (!m[key]) m[key] = []
      m[key].push(f)
    })
    return m
  }, [folios])

  function getFoliosForStore(nombre: string) {
    const key = nombre.toLowerCase().trim()
    for (const [k, v] of Object.entries(folioMap)) {
      if (k.includes(key) || key.includes(k)) return v
    }
    return []
  }

  function getColor(folios: Folio[]) {
    if (folios.length === 0) return "green"
    if (folios.some(f => f.prioridad === "ALTA")) return "red"
    if (folios.some(f => f.prioridad === "MEDIA")) return "orange"
    return "blue"
  }

  const tiendas = fCiudad === "todas" ? TIENDAS :
    TIENDAS.filter(t => fCiudad === "reynosa" ? t.ciudad === "Reynosa" : t.ciudad === "Rio Bravo")

  const center: [number, number] = fCiudad === "rio_bravo" ? [26.01, -98.09] : [26.05, -98.26]

  const stats = {
    total: TIENDAS.length,
    conFolios: TIENDAS.filter(t => getFoliosForStore(t.nombre).length > 0).length,
    altas: TIENDAS.filter(t => getFoliosForStore(t.nombre).some(f => f.prioridad === "ALTA")).length,
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <MapPin size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mapa de Tiendas</h1>
            <p className="text-dark-400 text-sm">Folios activos en tiempo real</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[["todas","Todas"],["reynosa","Reynosa"],["rio_bravo","Rio Bravo"]].map(([val, label]) => (
            <button key={val} onClick={() => setFCiudad(val)}
              className={val === fCiudad ? "px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-green/20 text-brand-green border border-brand-green/30" : "px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-800 text-dark-400 border border-dark-700"}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-black text-white">{stats.total}</div>
          <div className="text-xs text-dark-500 mt-1 uppercase">Tiendas</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-black text-orange-400">{stats.conFolios}</div>
          <div className="text-xs text-dark-500 mt-1 uppercase">Con folios</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-black text-red-400">{stats.altas}</div>
          <div className="text-xs text-dark-500 mt-1 uppercase">ALTA prioridad</div>
        </div>
      </div>

      <div className="card p-3">
        <div className="flex gap-4 text-xs flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/>ALTA prioridad</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"/>MEDIA prioridad</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block"/>BAJA prioridad</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"/>Sin folios</span>
        </div>
      </div>

      {mapReady && (
        <div className="rounded-xl overflow-hidden border border-dark-700" style={{ height: "500px" }}>
          <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="OpenStreetMap"
            />
            {tiendas.map(t => {
              const tFolios = getFoliosForStore(t.nombre)
              const color = getColor(tFolios)
              const icon = typeof window !== "undefined" ? new (require("leaflet").DivIcon)({
                html: `<div style="width:14px;height:14px;border-radius:50%;background:${color === "red" ? "#ef4444" : color === "orange" ? "#f97316" : color === "blue" ? "#60a5fa" : "#22c55e"};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.5)"></div>`,
                className: "",
                iconSize: [14, 14],
              }) : undefined
              return (
                <Marker key={t.cr} position={[t.lat, t.lng]} icon={icon}>
                  <Popup>
                    <div style={{ minWidth: "180px" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{t.nombre}</div>
                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "6px" }}>{t.ciudad} · {t.cr}</div>
                      {tFolios.length === 0 ? (
                        <div style={{ color: "green", fontSize: "12px" }}>Sin folios activos</div>
                      ) : (
                        tFolios.map(f => (
                          <div key={f.id} style={{ fontSize: "12px", marginBottom: "2px" }}>
                            <span style={{ color: f.prioridad === "ALTA" ? "red" : f.prioridad === "MEDIA" ? "orange" : "blue" }}>
                              {f.prioridad}
                            </span> #{f.numero_folio}
                          </div>
                        ))
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      )}
    </div>
  )
}
