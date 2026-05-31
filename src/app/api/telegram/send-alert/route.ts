import { NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!

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

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log("SUPABASE_URL:", SUPABASE_URL?.slice(0, 40))
    console.log("SUPABASE_KEY:", SUPABASE_KEY?.slice(0, 20))

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 })
    }

    const fetchUrl = `${SUPABASE_URL}/rest/v1/folios?select=*&order=fecha_vencimiento.asc&limit=100`
    console.log("Fetching:", fetchUrl)

    const res = await fetch(fetchUrl, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    })

    console.log("Response status:", res.status)
    const folios = await res.json()
    console.log("Folios count:", Array.isArray(folios) ? folios.length : "NOT ARRAY", typeof folios)

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

    const activos = folios.filter((f: any) => f.estatus !== "Cerrado")

    const importantes = activos.filter((f: any) => {
      if (f.prioridad === "BAJA") return false
      const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
      return secs <= 108000
    }).sort((a: any, b: any) =>
      new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
    )

    const lines = [
      `🚨 *REPORTE FOLIOS OXXO*`,
      `📅 ${fecha} — ${hora}`,
      `📊 Activos: ${activos.length} | Urgentes: ${importantes.length}`,
      ``,
    ]

    if (importantes.length === 0) {
      lines.push("✅ Sin folios urgentes en este momento.")
    } else {
      importantes.forEach((f: any, i: number) => {
        const secs = (new Date(f.fecha_vencimiento).getTime() - now) / 1000
        const tiempo = formatTiempo(secs)
        const e = f.prioridad === "ALTA" ? "🔴" : "🟡"
        const ciudad = f.ciudad === "Rio Bravo" ? "🔵 RB" : "⚪ Rey"
        lines.push(`${i+1}. ${e} #${f.numero_folio} ${f.tienda_nombre} ${ciudad}`)
        lines.push(`   ↳ ${f.falla || f.motivo || "Sin descripcion"}`)
        lines.push(`   ⏱ ${tiempo}`)
      })
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

    return NextResponse.json({ 
      ok: true, 
      sent: importantes.length,
      total: folios.length,
      activos: activos.length,
      debug: importantes.slice(0,3).map((f:any) => ({
        numero: f.numero_folio,
        estatus: f.estatus,
        prioridad: f.prioridad,
        vence: f.fecha_vencimiento
      }))
    })

  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
