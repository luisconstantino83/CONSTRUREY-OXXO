import type { ParsedCorreo, Prioridad } from '@/types'

const EXPIRY_HOURS: Record<Prioridad, number> = { ALTA: 6, MEDIA: 72, BAJA: 29 * 24 }

const MESES: Record<string, number> = {
  enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
  julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12,
}

export function extractFechaCorreo(text: string): Date | null {
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  if (isoMatch) return new Date(isoMatch[0])

  const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
  if (slashMatch) {
    const [,d,m,y,h,min] = slashMatch
    return new Date(+y, +m-1, +d, +h, +min)
  }

  const spanishMatch = text.match(
    /(\d{1,2})\s+de\s+([a-záéíóú]+)\s*(?:de\s+(\d{4}))?,?\s+(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i
  )
  if (spanishMatch) {
    const [,day, mes, yearStr, hStr, minStr, ampm] = spanishMatch
    const month = MESES[mes.toLowerCase()]
    if (month) {
      const year = yearStr ? +yearStr : new Date().getFullYear()
      let hour = +hStr
      if (ampm) {
        const isPM = ampm.toLowerCase().replace(/\./g,'').includes('pm')
        const isAM = ampm.toLowerCase().replace(/\./g,'').includes('am')
        if (isPM && hour < 12) hour += 12
        if (isAM && hour === 12) hour = 0
      }
      return new Date(year, month - 1, +day, hour, +minStr)
    }
  }
  return null
}

export function parseCorreo(text: string): ParsedCorreo {
  const raw = text.trim()
  const lower = raw.toLowerCase()

  const isCierre =
    lower.includes('fue cerrado') ||
    lower.includes('cerrado con los siguientes') ||
    lower.includes('fecha de solución') ||
    lower.includes('fecha de solucion') ||
    lower.includes('nombre de la persona que cierra') ||
    lower.includes('como quedo solucionado') ||
    lower.includes('asignado - cierre') ||
    lower.includes('cierre')

  const tipo = isCierre ? 'cierre'
    : (lower.includes('ticket') || lower.includes('folio') || lower.includes('nos reportó') || lower.includes('nos reporto'))
    ? 'apertura' : 'desconocido'

  const fecha_correo = extractFechaCorreo(raw)

  const ticketMatch =
    raw.match(/n[úu]mero de ticket\s*(?:es)?:?\s*(\d{6,10})/i) ||
    raw.match(/el ticket\s+(\d{6,10})/i) ||
    raw.match(/ticket\s+(\d{6,10})/i) ||
    raw.match(/folio\s*(?:es|no\.?|#)?\s*:?\s*(\d{6,10})/i) ||
    raw.match(/\b(\d{8})\b/)
  const ticket = ticketMatch?.[1]

  const idMatch = raw.match(/OXXO\s+([A-Z0-9]{6,15})\b/)
  const id_tienda = idMatch?.[1]

  let tienda_nombre: string | undefined
  const nameMatch1 = raw.match(/tienda\s+OXXO\s+[A-Z0-9]+\s+(.+?)\s*(?:,\s*(?:ubicada|referente)|$)/im)
  const nameMatch2 = raw.match(/tienda\s+OXXO\s+(.+?)\s*(?:,|\.|referente|ubicada)/i)
  const nameMatch3 = raw.match(/de\s+la\s+tienda\s+[A-Z0-9]+\s+(.+?)\s*(?:,|\.|referente|$)/im)
  const rawName = nameMatch1?.[1] || nameMatch2?.[1] || nameMatch3?.[1]
  if (rawName) {
    tienda_nombre = rawName
      .replace(/,?\s*ubicada.*/i, '')
      .replace(/\s+(olivia|sandra|garcia|solis|hernandez|martinez|lopez|gonzalez)\s+.*/i, '')
      .trim()
  }

  const ciudad =
    lower.includes('río bravo') || lower.includes('rio bravo') || lower.includes('nuevo progreso') || lower.includes('88810')
      ? 'Río Bravo' : 'Reynosa'

  let prioridad: Prioridad = 'MEDIA'
  if (lower.includes('prioridad: alta') || lower.includes('prioridad alta') || lower.includes('06 hrs') || lower.includes('6 hrs'))
    prioridad = 'ALTA'
  else if (lower.includes('prioridad: baja') || lower.includes('prioridad baja') || lower.includes('29 d') || lower.includes('720 hrs'))
    prioridad = 'BAJA'

  const motivoMatch = raw.match(/motivo\s*:?\s*(.+?)(?:\n|Representante|Prestador|Falla|Categoria|$)/is)
  const motivo = motivoMatch?.[1]?.replace(/\n.*/s,'').trim()

  const fallaEspMatch = raw.match(/falla\s+espec[íi]fica\s*:?\s*(.+?)(?:\n|fue cerrado|$)/is)
  const falla_especifica = fallaEspMatch?.[1]?.replace(/,\s*fue cerrado.*/is,'').trim()

  const fallaLower = (motivo || falla_especifica || '').toLowerCase()
  let categoria = 'Otro'
  if (fallaLower.includes('iluminaci') || fallaLower.includes('luz') || fallaLower.includes('luminaria') || fallaLower.includes('lampara') || fallaLower.includes('contacto')) categoria = 'Electricidad'
  else if (fallaLower.includes('refriger') || fallaLower.includes('temperatura') || fallaLower.includes('hielo') || fallaLower.includes('enfri')) categoria = 'Refrigeración'
  else if (fallaLower.includes('aire') || fallaLower.includes('a/c') || fallaLower.includes('climat')) categoria = 'Climatización'
  else if (fallaLower.includes('plomer') || fallaLower.includes('fuga') || fallaLower.includes('agua') || fallaLower.includes('wc') || fallaLower.includes('bomba') || fallaLower.includes('sanitario')) categoria = 'Plomería'
  else if (fallaLower.includes('camara') || fallaLower.includes('cctv') || fallaLower.includes('seguridad')) categoria = 'Seguridad'
  else if (fallaLower.includes('pos') || fallaLower.includes('terminal') || fallaLower.includes('sistema')) categoria = 'Sistemas'
  else if (fallaLower.includes('puerta') || fallaLower.includes('techo') || fallaLower.includes('civil') || fallaLower.includes('instalacion') || fallaLower.includes('varios')) categoria = 'Obra Civil'

  const repMatch = raw.match(/representante\s+(?:propietario|propiet[a-z]*)\s*:?\s*(.+?)(?:\n|$)/i)
  const representante_propietario = repMatch?.[1]?.trim()

  const prestMatch = raw.match(/prestador\s+de\s+servicio\s*:?\s*(.+?)(?:\n|$)/i)
  const prestador_servicio = prestMatch?.[1]?.trim()

  const tiempoMatch = raw.match(/tiempo\s+de\s+respuesta\s*:?\s*(.+?)(?:\n|$)/i)
  const tiempo_respuesta = tiempoMatch?.[1]?.trim()

  const fechaAsgMatch = raw.match(/fecha\s+(?:de\s+)?asignaci[óo]n\s*:?\s*(.+?)(?:\n|$)/i)
  const fecha_asignacion = fechaAsgMatch?.[1]?.trim()

  const cierreMatch =
    raw.match(/fue\s+cerrado\s+con\s+los\s+siguientes\s+comentarios[:\s]*(.+?)(?:nombre\s+de\s+(?:quien|la\s+persona)|fecha\s+de\s+soluci|$)/is) ||
    raw.match(/cerrado\s+con\s+los\s+siguientes\s+comentarios[:\s]*(.+?)(?:nombre|fecha|$)/is)
  const comentarios_cierre = cierreMatch?.[1]?.trim()

  const personaCierraMatch =
    raw.match(/nombre\s+de\s+la\s+persona\s+que\s+cierra[^:]*:?\s*(.+?)(?:\n|Prioridad|$)/i) ||
    raw.match(/nombre\s+de\s+quien\s+reporta\s*:?\s*(.+?)(?:\n|$)/i)
  const nombre_persona_cierra = personaCierraMatch?.[1]?.trim()

  const fechaSolMatch = raw.match(/fecha\s+de\s+soluci[óo]n\s*:?\s*(.+?)(?:\n|$)/i)
  const fecha_solucion = fechaSolMatch?.[1]?.trim()

  const comoSolMatch = raw.match(/como\s+quedo\s+solucionado[^:]*:?\s*(.+?)(?:\n|nombre|fecha|$)/is)
  const como_solucionado = comoSolMatch?.[1]?.trim()

  return {
    tipo, ticket, id_tienda, tienda_nombre, ciudad, prioridad, categoria,
    motivo, falla: motivo, falla_especifica, representante_propietario,
    prestador_servicio, tiempo_respuesta, fecha_asignacion,
    fecha_correo: fecha_correo?.toISOString(),
    comentarios_cierre: comentarios_cierre || como_solucionado,
    nombre_persona_cierra, fecha_solucion, raw,
  }
}

export function calcularFechaVencimiento(prioridad: Prioridad, desde?: Date): Date {
  const base = desde || new Date()
  return new Date(base.getTime() + EXPIRY_HOURS[prioridad] * 3600000)
}

export function formatTiempoRestante(segundos: number): string {
  if (segundos <= 0) return 'VENCIDO'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  if (h > 24) { const d = Math.floor(h / 24); return d + 'd ' + (h%24) + 'h' }
  if (h > 0) return h + 'h ' + m + 'm'
  if (m > 0) return m + 'm ' + s + 's'
  return s + 's'
}

export function getColorByTime(segundos: number, estatus: string): string {
  if (estatus === 'Cerrado') return 'text-dark-400'
  if (estatus === 'Vencido' || segundos <= 0) return 'text-red-500'
  if (segundos < 3600) return 'text-red-400'
  if (segundos < 21600) return 'text-orange-400'
  if (segundos < 86400) return 'text-yellow-400'
  return 'text-green-400'
}

export function getBgByPriority(prioridad: Prioridad, vencido = false): string {
  if (vencido) return 'border-red-500/40 bg-red-500/5'
  if (prioridad === 'ALTA') return 'border-orange-500/30 bg-orange-500/5'
  if (prioridad === 'MEDIA') return 'border-yellow-500/30 bg-yellow-500/5'
  return 'border-dark-600 bg-dark-800'
}
