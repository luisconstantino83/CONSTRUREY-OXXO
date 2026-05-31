import { NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!

function formatTiempo(secs: number): string {
  if (secs <= 0) return "⚠ VENCIDO"
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 24) return `${Math.floor(h/24)}d ${h%24}h`
  return `${h}h ${m}m`
}

export async function POST() {
  try {
    const now = Date.now()

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/folios?select=*&estatus=neq.Cerrado&order=fecha_vencimiento.asc&limit=200`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )

    const folios = await res.json()

    if (!Array.isArray(folios)) {
      return NextResponse.json({ error: "No data", raw: folios }, { status: 500 })
    }

    const nowReyosa = new Date(now)
    const fecha = nowReyosa.toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long",
      timeZone: "America/Matamoros"
    })
    const hora = nowReyosa.toLocaleTimeString("es-MX", {
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/Matamoros"
    })

    // Filtrar: ALTA siempre, MEDIA solo si vence en menos de 24h, no BAJA
    const importantes = folios.filter((f: any) => {
      if (f.prioridad === "BAJA") return false
      const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
      if (f.prioridad === "ALTA" && secs <= 86400) return true
      if (f.prioridad === "MEDIA" && secs <= 86400) return true
      return false
    }).sort((a: any, b: any) =>
      new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
    )

    const lines = [
      `🚨 *REPORTE FOLIOS OXXO*`,
      `📅 ${fecha} — ${hora}`,
      `📊 Activos: ${folios.length} | Urgentes <24h: ${importantes.length}`,
      ``,
    ]

    if (importantes.length === 0) {
      lines.push("✅ Sin folios urgentes en este momento.")
    } else {
      const reynosa = importantes.filter((f: any) => f.ciudad !== "Rio Bravo")
      const rioBravo = importantes.filter((f: any) => f.ciudad === "Rio Bravo")

      if (reynosa.length > 0) {
        lines.push(`⚪ *REYNOSA*`)
        reynosa.forEach((f: any, i: number) => {
          const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
          const tiempo = formatTiempo(secs)
          const e = f.prioridad === "ALTA" ? "🔴" : "🟡"
          lines.push(`${i+1}. ${e} #${f.numero_folio} ${f.tienda_nombre}`)
          lines.push(`   ↳ ${f.falla || f.motivo || "Sin descripcion"}`)
          lines.push(`   ⏱ ${tiempo}`)
        })
        lines.push("")
      }

      if (rioBravo.length > 0) {
        lines.push(`🔵 *RIO BRAVO*`)
        rioBravo.forEach((f: any, i: number) => {
          const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
          const tiempo = formatTiempo(secs)
          const e = f.prioridad === "ALTA" ? "🔴" : "🟡"
          lines.push(`${i+1}. ${e} #${f.numero_folio} ${f.tienda_nombre}`)
          lines.push(`   ↳ ${f.falla || f.motivo || "Sin descripcion"}`)
          lines.push(`   ⏱ ${tiempo}`)
        })
      }
    }

    lines.push(``)
    lines.push(`_CONSTRUREY © Control OXXO_`)

    const message = lines.join("\n")

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    )

    const tgData = await tgRes.json()

    if (!tgData.ok) {
      return NextResponse.json({ error: tgData.description }, { status: 500 })
    }

    return NextResponse.json({ ok: true, sent: importantes.length, total: folios.length })

  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
