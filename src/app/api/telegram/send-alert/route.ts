import { NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function formatTiempo(secs: number): string {
  if (secs <= 0) return "VENCIDO"
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 24) return `${Math.floor(h/24)}d ${h%24}h`
  return `${h}h ${m}m`
}

export async function POST() {
  try {
    const now = Date.now()

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/folios?estatus=in.(Abierto,Vencido)&order=fecha_vencimiento.asc&limit=100`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )

    const folios = await res.json()

    if (!Array.isArray(folios)) {
      return NextResponse.json({ error: "No data" }, { status: 500 })
    }

    const importantes = folios.filter(f => {
      const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
      if (secs <= 0) return false
      if (f.prioridad === "ALTA") return true
      if (f.prioridad === "MEDIA" && secs < 86400) return true
      return false
    })

    const fecha = new Date().toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long"
    })
    const hora = new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit", minute: "2-digit"
    })

    const lines = [
      `🚨 *ACTUALIZACIÓN FOLIOS OXXO*`,
      `📅 ${fecha} — ${hora}`,
      ``,
      `📊 Activos: ${folios.length} | Urgentes: ${importantes.length}`,
      ``,
    ]

    if (importantes.length === 0) {
      lines.push("✅ No hay folios urgentes en este momento.")
    } else {
      const menos24 = importantes.filter(f => {
        const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
        return secs < 86400
      })
      const resto = importantes.filter(f => {
        const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
        return secs >= 86400
      })

      if (menos24.length > 0) {
        lines.push(`🔴 *VENCEN EN MENOS DE 24H*`)
        menos24.forEach((f, i) => {
          const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
          const tiempo = formatTiempo(secs)
          const e = f.prioridad === "ALTA" ? "🔴" : "🟡"
          const ciudad = f.ciudad === "Rio Bravo" ? "🔵" : "⚪"
          lines.push(`${i+1}. ${e} #${f.numero_folio} ${f.tienda_nombre} ${ciudad}`)
          lines.push(`   ↳ ${f.falla || f.motivo || "Sin descripcion"}`)
          lines.push(`   ⏱ ${tiempo}`)
        })
        lines.push("")
      }

      if (resto.length > 0) {
        lines.push(`🟢 *RESTO DE FOLIOS ACTIVOS*`)
        resto.forEach((f, i) => {
          const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
          const tiempo = formatTiempo(secs)
          const e = f.prioridad === "ALTA" ? "🔴" : "🟡"
          const ciudad = f.ciudad === "Rio Bravo" ? "🔵" : "⚪"
          lines.push(`${i+1}. ${e} #${f.numero_folio} ${f.tienda_nombre} ${ciudad}`)
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

    return NextResponse.json({ ok: true, sent: importantes.length })

  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
