"use client"
import { useEffect, useState, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { MapPin, Filter } from "lucide-react"
import dynamic from "next/dynamic"

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false })

const TIENDAS = [
  { cr: '50JEV', nombre: 'OXXO AGUSTIN LARA REX', ciudad: 'Reynosa', lat: 26.07045071771738, lng: -98.30710549684545, direccion: 'BLVD. DEL MAESTRO ESQ. AGUSTIN LARA COL:NARCIZO MENDOZA' },
  { cr: '50BTH', nombre: 'OXXO BEETHOVEN REX', ciudad: 'Reynosa', lat: 26.074535819860767, lng: -98.30971684233408, direccion: 'CALLE BEETHOVEN Y PADRE SOLER COLONIA NARCIZO MENDOZA' },
  { cr: '50BPI', nombre: 'OXXO CANADA REX', ciudad: 'Reynosa', lat: 26.06369180615547, lng: -98.31081098096226, direccion: 'CALLE LONDRES SN COL CANADA' },
  { cr: '50IEP', nombre: 'OXXO CIRCUITO INDEPENDENCIA REX', ciudad: 'Reynosa', lat: 26.060041223661532, lng: -98.32243193135783, direccion: 'RIO SAN JUAN ESQ. CIRCUITO INDEPENDENCIA SN COL AZTLAN PROLONGACION' },
  { cr: '50BZE', nombre: 'OXXO DEL MAESTRO REX', ciudad: 'Reynosa', lat: 26.0708491684661, lng: -98.30080123045785, direccion: 'BLVD. DEL MAESTRO S/N COL DEL SOL REYNOSA, TAMAULIPAS' },
  { cr: '50SWE', nombre: 'OXXO DOCTORES REX', ciudad: 'Reynosa', lat: 26.074595805505973, lng: -98.2944256822441, direccion: 'CALLE PRIMERA AV. MIGUEL ALEMAN SN COL DOCTORES' },
  { cr: '50CJT', nombre: 'OXXO ELIAS PINA REX', ciudad: 'Reynosa', lat: 26.07578682505668, lng: -98.28988458279022, direccion: 'BLVD ELIAS PINA Y MATAMOROS COL LONGORIA' },
  { cr: '50OFF', nombre: 'OXXO FUENTES REX', ciudad: 'Reynosa', lat: 26.08550567817929, lng: -98.28013066274607, direccion: 'BLVD FUENTES Y BLVD. DEL MAESTRO COL FUENTES' },
  { cr: '508KH', nombre: 'OXXO GENERAL ALVARO REX', ciudad: 'Reynosa', lat: 26.073148050296116, lng: -98.27384481659037, direccion: 'CARR. MIGUEL ALEMAN KM 4 COL RODRIGUEZ' },
  { cr: '50GNB', nombre: 'OXXO AEROPUERTO REX', ciudad: 'Reynosa', lat: 26.03311157834524, lng: -98.23249400779088, direccion: 'BLVD. DEL AEROPUERTO Y CALLE LIMA COL LOMAS DEL REAL' },
  { cr: '50JHS', nombre: 'OXXO UNIV TECNOLOGICA REX', ciudad: 'Reynosa', lat: 26.022497906985674, lng: -98.23993066325617, direccion: 'BLVD. MORELOS Y PASEO DE LAS MISIONES SN COL LOMA REAL' },
  { cr: '50BZD', nombre: 'OXXO LOPEZ PORTILLO REX', ciudad: 'Reynosa', lat: 26.09393710765037, lng: -98.27000825083426, direccion: 'BLVD. LOPEZ PORTILLO Y BLVD. DEL MAESTRO COL INDUSTRIAL' },
  { cr: '50LHV', nombre: 'OXXO PETROLERA REX', ciudad: 'Reynosa', lat: 26.07578682505668, lng: -98.26, direccion: 'PETROLERA' },
  { cr: '5059A', nombre: 'OXXO UNIDAD OBRERA REX', ciudad: 'Reynosa', lat: 26.068, lng: -98.255, direccion: 'UNIDAD OBRERA' },
  { cr: '50FDJ', nombre: 'OXXO LAMPACITOS REX', ciudad: 'Reynosa', lat: 26.067, lng: -98.253, direccion: 'LAMPACITOS' },
  { cr: '50EHO', nombre: 'OXXO DELICIAS REX', ciudad: 'Reynosa', lat: 26.055, lng: -98.248, direccion: 'DELICIAS' },
  { cr: '50EPW', nombre: 'OXXO ESPUELA REX', ciudad: 'Reynosa', lat: 26.072, lng: -98.249, direccion: 'ESPUELA' },
  { cr: '50UGR', nombre: 'OXXO ALMAGUER REX', ciudad: 'Reynosa', lat: 26.076, lng: -98.27, direccion: 'ALMAGUER' },
  { cr: '50WFW', nombre: 'OXXO TOTECO REX', ciudad: 'Reynosa', lat: 26.069, lng: -98.251, direccion: 'TOTECO' },
  { cr: '50WLJ', nombre: 'OXXO GENERAL RODRIGUEZ REX', ciudad: 'Reynosa', lat: 26.074, lng: -98.252, direccion: 'GENERAL RODRIGUEZ' },
  { cr: '50ZZS', nombre: 'OXXO ZACATECAS REX', ciudad: 'Reynosa', lat: 26.066, lng: -98.256, direccion: 'ZACATECAS' },
  { cr: '50BRM', nombre: 'OXXO ALMENDROS REX', ciudad: 'Reynosa', lat: 26.048, lng: -98.242, direccion: 'ALMENDROS' },
  { cr: '50LKI', nombre: 'OXXO BALCONES DE ALCALA REX', ciudad: 'Reynosa', lat: 26.04, lng: -98.238, direccion: 'BALCONES DE ALCALA' },
  { cr: '50YBK', nombre: 'OXXO LAUREL REX', ciudad: 'Reynosa', lat: 26.042, lng: -98.236, direccion: 'LAUREL' },
  { cr: '50ZLT', nombre: 'OXXO LATON REX', ciudad: 'Reynosa', lat: 26.046, lng: -98.24, direccion: 'LATON' },
  { cr: '50ZZJ', nombre: 'OXXO CHAPULTEPEC REX', ciudad: 'Reynosa', lat: 26.085, lng: -98.265, direccion: 'CHAPULTEPEC' },
  { cr: '50ZZH', nombre: 'OXXO CAMPANARIO REX', ciudad: 'Reynosa', lat: 26.086, lng: -98.266, direccion: 'CAMPANARIO' },
  { cr: '50ZZR', nombre: 'OXXO MAQUILADORAS REX', ciudad: 'Reynosa', lat: 26.088, lng: -98.268, direccion: 'MAQUILADORAS' },
  { cr: '50BIX', nombre: 'OXXO CAMPO MILITAR REX', ciudad: 'Reynosa', lat: 26.018, lng: -98.23, direccion: 'CAMPO MILITAR' },
  { cr: '50HTL', nombre: 'OXXO JACALITOS REX', ciudad: 'Reynosa', lat: 26.01, lng: -98.22, direccion: 'JACALITOS' },
  { cr: '50LLL', nombre: 'OXXO LAS TORRES REX', ciudad: 'Reynosa', lat: 26.055, lng: -98.252, direccion: 'LAS TORRES' },
  { cr: '500ER', nombre: 'OXXO TAMAULIPAS REX', ciudad: 'Reynosa', lat: 26.058, lng: -98.258, direccion: 'TAMAULIPAS' },
  { cr: '50ZPS', nombre: 'OXXO LA PRESA REX', ciudad: 'Reynosa', lat: 26.056, lng: -98.256, direccion: 'LA PRESA' },
  { cr: '50IDL', nombre: 'OXXO IDEAL REX', ciudad: 'Reynosa', lat: 26.052, lng: -98.254, direccion: 'IDEAL' },
  { cr: '50QSO', nombre: 'OXXO COLOSIO REX', ciudad: 'Reynosa', lat: 26.05, lng: -98.258, direccion: 'COLOSIO' },
  { cr: '50VYO', nombre: 'OXXO BENITO JUAREZ REX', ciudad: 'Reynosa', lat: 26.048, lng: -98.256, direccion: 'BENITO JUAREZ' },
  { cr: '50FKH', nombre: 'OXXO HEROES DE LA REFORMA REX', ciudad: 'Reynosa', lat: 26.046, lng: -98.254, direccion: 'HEROES DE LA REFORMA' },
  { cr: '500GN', nombre: 'OXXO FCO NICODEMO REX', ciudad: 'Reynosa', lat: 26.015, lng: -98.24, direccion: 'FCO NICODEMO' },
  { cr: '50JNO', nombre: 'OXXO JARACHINA NTE REX', ciudad: 'Reynosa', lat: 26.1, lng: -98.275, direccion: 'JARACHINA NTE' },
  { cr: '50AVB', nombre: 'OXXO MODULO 2000 REX', ciudad: 'Reynosa', lat: 26.08, lng: -98.28, direccion: 'MODULO 2000' },
  { cr: '505BX', nombre: 'OXXO NOVENA REX', ciudad: 'Reynosa', lat: 26.09, lng: -98.272, direccion: 'NOVENA' },
  { cr: '50TEF', nombre: 'OXXO ORIENTE 2 REX', ciudad: 'Reynosa', lat: 26.092, lng: -98.274, direccion: 'ORIENTE 2' },
  { cr: '50PEK', nombre: 'OXXO PEKIN REX', ciudad: 'Reynosa', lat: 26.088, lng: -98.276, direccion: 'PEKIN' },
  { cr: '50I65', nombre: 'OXXO COMETA REX', ciudad: 'Rio Bravo', lat: 26.02, lng: -98.1, direccion: 'COMETA' },
  { cr: '50KC6', nombre: 'OXXO ALLENDE REX', ciudad: 'Rio Bravo', lat: 26.015, lng: -98.095, direccion: 'ALLENDE' },
  { cr: '50PIQ', nombre: 'OXXO PIRUL REX', ciudad: 'Rio Bravo', lat: 26.018, lng: -98.098, direccion: 'PIRUL' },
  { cr: '506PN', nombre: 'OXXO BRECHA 108 REX', ciudad: 'Rio Bravo', lat: 26.022, lng: -98.102, direccion: 'BRECHA 108' },
  { cr: '50BSH', nombre: 'OXXO BRECHA REX', ciudad: 'Rio Bravo', lat: 26.023, lng: -98.103, direccion: 'BRECHA' },
  { cr: '50W87', nombre: 'OXXO AZTECA REX', ciudad: 'Rio Bravo', lat: 26.024, lng: -98.104, direccion: 'AZTECA' },
  { cr: '50RGJ', nombre: 'OXXO GUANAJUATO REX', ciudad: 'Rio Bravo', lat: 26.026, lng: -98.106, direccion: 'GUANAJUATO' },
  { cr: '50WTG', nombre: 'OXXO COAHUILA REX', ciudad: 'Rio Bravo', lat: 26.025, lng: -98.105, direccion: 'COAHUILA' },
  { cr: '50NAK', nombre: 'OXXO YUCATAN REX', ciudad: 'Rio Bravo', lat: 26.019, lng: -98.097, direccion: 'YUCATAN' },
  { cr: '50NPR', nombre: 'OXXO NUEVO PROGRESO REX', ciudad: 'Rio Bravo', lat: 26.065, lng: -97.95, direccion: 'NUEVO PROGRESO' },
  { cr: '50OCW', nombre: 'OXXO OCEANO ATLANTICO REX', ciudad: 'Rio Bravo', lat: 26.021, lng: -98.101, direccion: 'OCEANO ATLANTICO' },
  { cr: '50CIF', nombre: 'OXXO COLEGIO MILITAR REX', ciudad: 'Rio Bravo', lat: 26.005, lng: -98.09, direccion: 'COLEGIO MILITAR' },
  { cr: '50JGG', nombre: 'OXXO JALAPA REX', ciudad: 'Rio Bravo', lat: 26.002, lng: -98.088, direccion: 'JALAPA' },
  { cr: '50LB0', nombre: 'OXXO CENTRAL RIO BRAVO REX', ciudad: 'Rio Bravo', lat: 26.003, lng: -98.087, direccion: 'CENTRAL RIO BRAVO' },
  { cr: '50B19', nombre: 'OXXO 16 DE SEPTIEMBRE REX', ciudad: 'Rio Bravo', lat: 26.004, lng: -98.086, direccion: '16 DE SEPTIEMBRE' },
  { cr: '50C35', nombre: 'OXXO SUR 2 REX', ciudad: 'Rio Bravo', lat: 26.006, lng: -98.091, direccion: 'SUR 2' },
  { cr: '50L2O', nombre: 'OXXO ALAMO REX', ciudad: 'Rio Bravo', lat: 26.01, lng: -98.095, direccion: 'ALAMO' },
  { cr: '502Y6', nombre: 'OXXO CONQUISTADORES REX', ciudad: 'Rio Bravo', lat: 26.012, lng: -98.093, direccion: 'CONQUISTADORES' },
  { cr: '50CXQ', nombre: 'OXXO CUAUHTEMOC REX', ciudad: 'Rio Bravo', lat: 26.008, lng: -98.092, direccion: 'CUAUHTEMOC' },
  { cr: '50DMQ', nombre: 'OXXO DEL RIO REX', ciudad: 'Rio Bravo', lat: 26.007, lng: -98.091, direccion: 'DEL RIO' },
  { cr: '50RLA', nombre: 'OXXO AMERICAS REX', ciudad: 'Rio Bravo', lat: 26.009, lng: -98.094, direccion: 'AMERICAS' },
  { cr: '50RRF', nombre: 'OXXO SANTA FE REX', ciudad: 'Rio Bravo', lat: 26.011, lng: -98.096, direccion: 'SANTA FE' },
  { cr: '50V4X', nombre: 'OXXO MATAMOROS REX', ciudad: 'Rio Bravo', lat: 26.013, lng: -98.097, direccion: 'MATAMOROS' },
  { cr: '50XIU', nombre: 'OXXO GUERRERO REX', ciudad: 'Rio Bravo', lat: 26.014, lng: -98.098, direccion: 'GUERRERO' },
  { cr: '507UA', nombre: 'OXXO TLAXCALA REX', ciudad: 'Rio Bravo', lat: 26.016, lng: -98.099, direccion: 'TLAXCALA' },
  { cr: '50BCY', nombre: 'OXXO BRISAS DEL CAMPO REX', ciudad: 'Rio Bravo', lat: 26.017, lng: -98.1, direccion: 'BRISAS DEL CAMPO' },
  { cr: '50M80', nombre: 'OXXO FRANCISCO I MADERO REX', ciudad: 'Rio Bravo', lat: 26.005, lng: -98.089, direccion: 'FRANCISCO I MADERO' },
  { cr: '50K8S', nombre: 'OXXO LAS LIEBRES REX', ciudad: 'Rio Bravo', lat: 26.003, lng: -98.085, direccion: 'LAS LIEBRES' },
  { cr: '5073P', nombre: 'OXXO ABASOLO REX', ciudad: 'Rio Bravo', lat: 26.001, lng: -98.084, direccion: 'ABASOLO' },
  { cr: '502TV', nombre: 'OXXO GAS VALEO REX', ciudad: 'Rio Bravo', lat: 26.002, lng: -98.086, direccion: 'GAS VALEO' },
]

interface Folio {
  id: string
  tienda_nombre: string
  prioridad: string
  estatus: string
  numero_folio: string
}

export default function MapaPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
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
    const key = nombre.toLowerCase().replace(/oxxo\s*/i, "").replace(/\s*rex\s*/i, "").trim()
    for (const [k, v] of Object.entries(folioMap)) {
      if (k.includes(key) || key.includes(k)) return v
    }
    return []
  }

  function getColor(fs: Folio[]) {
    if (fs.length === 0) return "#22c55e"
    if (fs.some(f => f.prioridad === "ALTA")) return "#ef4444"
    if (fs.some(f => f.prioridad === "MEDIA")) return "#f97316"
    return "#60a5fa"
  }

  const tiendas = fCiudad === "todas" ? TIENDAS :
    TIENDAS.filter(t => fCiudad === "reynosa" ? t.ciudad === "Reynosa" : t.ciudad === "Rio Bravo")

  const center: [number, number] = fCiudad === "rio_bravo" ? [26.01, -98.09] : [26.05, -98.26]

  const conFolios = TIENDAS.filter(t => getFoliosForStore(t.nombre).length > 0).length
  const altas = TIENDAS.filter(t => getFoliosForStore(t.nombre).some(f => f.prioridad === "ALTA")).length

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
          <div className="text-2xl font-black text-white">{TIENDAS.length}</div>
          <div className="text-xs text-dark-500 mt-1 uppercase">Tiendas</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-black text-orange-400">{conFolios}</div>
          <div className="text-xs text-dark-500 mt-1 uppercase">Con folios</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-black text-red-400">{altas}</div>
          <div className="text-xs text-dark-500 mt-1 uppercase">ALTA prioridad</div>
        </div>
      </div>

      <div className="card p-3">
        <div className="flex gap-4 text-xs flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/>ALTA</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block"/>MEDIA</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block"/>BAJA</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"/>Sin folios</span>
        </div>
      </div>

      {mapReady && (
        <div className="rounded-xl overflow-hidden border border-dark-700" style={{ height: "500px" }}>
          <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
            {tiendas.map(t => {
              const tFolios = getFoliosForStore(t.nombre)
              const color = getColor(tFolios)
              const icon = typeof window !== "undefined" ? new (require("leaflet").DivIcon)({
                html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.5)"></div>`,
                className: "",
                iconSize: [14, 14],
              }) : undefined
              return (
                <Marker key={t.cr} position={[t.lat, t.lng]} icon={icon}>
                  <Popup>
                    <div style={{ minWidth: "200px" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{t.nombre}</div>
                      <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>{t.ciudad} · {t.cr}</div>
                      <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px" }}>{t.direccion}</div>
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
