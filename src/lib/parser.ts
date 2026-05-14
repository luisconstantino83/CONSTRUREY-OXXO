import type { ParsedCorreo, Prioridad } from '@/types'

const EXPIRY_HOURS: Record<Prioridad, number> = { ALTA: 6, MEDIA: 72, BAJA: 29 * 24 }

export function parseCorreo(text: string): ParsedCorreo {
  const raw = text.trim()
  const lower = raw.toLowerCase()

  // ── Detect type ──────────────────────────────────────────
  const isCierre =
    lower.includes('fue cerrado') ||
    lower.includes('cerrado con los siguientes') ||
    lower.includes('fecha de solución') ||
    lower.includes('fecha de solucion') ||
    lower.includes('nombre de la persona que cierra')

  const tipo = isCierre ? 'cierre' : lower.includes('ticket') || lower.includes('folio') ? 'apertura' : 'desconocido'

  // ── Extract ticket number ─────────────────────────────────
  const ticketMatch =
    raw.match(/n[úu]mero de ticket\s*(?:es)?:?\s*(\d{6,10})/i) ||
    raw.match(/ticket\s+(\d{6,10})/i) ||
    raw.match(/folio\s*(?:es|no\.?|#)?\s*:?\s*(\d{6,10})/i) ||
    raw.match(/\b(\d{8})\b/)
  const ticket = ticketMatch?.[1]

  // ── Store ID ──────────────────────────────────────────────
  const idMatch = raw.match(/OXXO\s+([A-Z0-9]{6,15})\b/)
  const id_tienda = idMatch?.[1]

  // ── Store name ────────────────────────────────────────────
  const nameMatch =
    raw.match(/tienda\s+OXXO\s+(?:[A-Z0-9]+\s+)?(.+?)\s*,?\s+ubicada/i) ||
    raw.match(/tienda\s+OXXO\s+(.+?)\s*(?:,|\.|referente)/i)
  const tienda_nombre = nameMatch?.[1]?.trim()
    ?.replace(/\s+[A-Z]{2,}\s+[A-Z\s]+$/, '')
    ?.trim()

  // ── Ciudad ────────────────────────────────────────────────
  const ciudad = lower.includes('río bravo') || lower.includes('rio bravo') || lower.includes('nuevo progreso')
    ? 'Río Bravo'
    : 'Reynosa'

  // ── Prioridad ─────────────────────────────────────────────
  let prioridad: Prioridad = 'MEDIA'
  if (lower.includes('prioridad: alta') || lower.includes('prioridad alta') || lower.includes('06 hrs') || lower.includes('6 hrs'))
    prioridad = 'ALTA'
  else if (lower.includes('prioridad: baja') || lower.includes('prioridad baja') || lower.includes('29 d'))
    prioridad = 'BAJA'

  // ── Motivo / Falla ────────────────────────────────────────
  const motivoMatch = raw.match(/motivo\s*:?\s*(.+?)(?:\n|$)/i)
  const motivo = motivoMatch?.[1]?.trim()

  const fallaEspMatch = raw.match(/falla\s+espec[íi]fica\s*:?\s*(.+?)(?:\n|$)/i)
  const falla_especifica = fallaEspMatch?.[1]?.trim()

  // ── Categoria ─────────────────────────────────────────────
  const fallaLower = (motivo || '').toLowerCase()
  let categoria = 'Otro'
  if (fallaLower.includes('iluminaci') || fallaLower.includes('luz') || fallaLower.includes('luminaria')) categoria = 'Electricidad'
  else if (fallaLower.includes('refriger') || fallaLower.includes('temperatura') || fallaLower.includes('hielo')) categoria = 'Refrigeración'
  else if (fallaLower.includes('aire') || fallaLower.includes('a/c') || fallaLower.includes('climat')) categoria = 'Climatización'
  else if (fallaLower.includes('plomer') || fallaLower.includes('fuga') || fallaLower.includes('agua') || fallaLower.includes('wc') || fallaLower.includes('bomba')) categoria = 'Plomería'
  else if (fallaLower.includes('camara') || fallaLower.includes('cctv') || fallaLower.includes('seguridad')) categoria = 'Seguridad'
  else if (fallaLower.includes('pos') || fallaLower.includes('terminal') || fallaLower.includes('sistema')) categoria = 'Sistemas'
  else if (fallaLower.includes('puerta') || fallaLower.includes('techo') || fallaLower.includes('civil')) categoria = 'Obra Civil'

  // ── Representante / Prestador ─────────────────────────────
  const repMatch = raw.match(/representante\s+propietario\s*:?\s*(.+?)(?:\n|$)/i)
  const representante_propietario = repMatch?.[1]?.trim()

  const prestMatch = raw.match(/prestador\s+de\s+servicio\s*:?\s*(.+?)(?:\n|$)/i)
  const prestador_servicio = prestMatch?.[1]?.trim()

  // ── Tiempo respuesta ──────────────────────────────────────
  const tiempoMatch = raw.match(/tiempo\s+de\s+respuesta\s*:?\s*(.+?)(?:\n|$)/i)
  const tiempo_respuesta = tiempoMatch?.[1]?.trim()

  // ── Fecha asignacion ──────────────────────────────────────
  const fechaMatch = raw.match(/fecha\s+(?:de\s+)?asignaci[óo]n\s*:?\s*(.+?)(?:\n|$)/i)
  const fecha_asignacion = fechaMatch?.[1]?.trim()

  // ── CIERRE data ───────────────────────────────────────────
  const cierreMatch = raw.match(/cerrado\s+con\s+los\s+siguientes\s+comentarios[:\s]+(.+?)(?:fecha|nombre|$)/is)
  const comentarios_cierre = cierreMatch?.[1]?.trim()

  const personaCierraMatch = raw.match(/(?:nombre de la persona que cierra[^:]*|cerrado por)\s*:?\s*(.+?)(?:\n|$)/i)
  const nombre_persona_cierra = personaCierraMatch?.[1]?.trim()

  const fechaSolMatch = raw.match(/fecha\s+de\s+soluci[óo]n\s*:?\s*(.+?)(?:\n|$)/i)
  const fecha_solucion = fechaSolMatch?.[1]?.trim()

  return {
    tipo,
    ticket,
    id_tienda,
    tienda_nombre,
    ciudad,
    prioridad,
    categoria,
    motivo,
    falla: motivo,
    falla_especifica,
    representante_propietario,
    prestador_servicio,
    tiempo_respuesta,
    fecha_asignacion,
    comentarios_cierre,
    nombre_persona_cierra,
    fecha_solucion,
    raw,
  }
}

export function calcularFechaVencimiento(prioridad: Prioridad, desde?: Date): Date {
  const base = desde || new Date()
  const hours = EXPIRY_HOURS[prioridad]
  return new Date(base.getTime() + hours * 3600000)
}

export function formatTiempoRestante(segundos: number): string {
  if (segundos <= 0) return 'VENCIDO'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  if (h > 24) {
    const d = Math.floor(h / 24)
    const rh = h % 24
    return `${d}d ${rh}h`
  }
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function getColorByTime(segundos: number, estatus: string): string {
  if (estatus === 'Cerrado') return 'text-dark-400'
  if (estatus === 'Vencido' || segundos <= 0) return 'text-red-500'
  if (segundos < 3600)  return 'text-red-400'
  if (segundos < 21600) return 'text-orange-400'
  if (segundos < 86400) return 'text-yellow-400'
  return 'text-green-400'
}

export function getBgByPriority(prioridad: Prioridad, vencido = false): string {
  if (vencido) return 'border-red-500/40 bg-red-500/5'
  if (prioridad === 'ALTA')  return 'border-orange-500/30 bg-orange-500/5'
  if (prioridad === 'MEDIA') return 'border-yellow-500/30 bg-yellow-500/5'
  return 'border-dark-600 bg-dark-800'
}
