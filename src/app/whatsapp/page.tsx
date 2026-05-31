"use client"
import { useRef, useEffect, useState } from "react"
import { useFolios } from "@/hooks/useFolios"
import { formatTiempoRestante } from "@/lib/parser"
import { format } from "date-fns"
import { Download, Copy, RefreshCw } from "lucide-react"
import { toast } from "sonner"

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}
function trunc(s: string | undefined | null, n: number) { return s && s.length > n ? s.slice(0,n-1)+"…" : (s||"") }
function getRowStyle(prioridad: string, secs: number, ciudad: string) {
  const isRB = ciudad === "Rio Bravo"
  const baseRow = isRB ? "#f0f4ff" : "#ffffff"
  const altRow  = isRB ? "#e8eeff" : "#f9f9f9"
  if (prioridad==="ALTA"&&secs<10800) return {row:baseRow,alt:altRow,badge:"#e74c3c",bt:"#fff",label:"CRITICO",dot:"#e74c3c"}
  if (prioridad==="ALTA") return {row:baseRow,alt:altRow,badge:"#e67e22",bt:"#fff",label:"ALTA",dot:"#e67e22"}
  if (prioridad==="MEDIA"&&secs<86400) return {row:baseRow,alt:altRow,badge:"#f39c12",bt:"#fff",label:"MEDIA",dot:"#f39c12"}
  if (prioridad==="MEDIA") return {row:baseRow,alt:altRow,badge:"#d4ac0d",bt:"#333",label:"MEDIA",dot:"#d4ac0d"}
  return {row:baseRow,alt:altRow,badge:"#27ae60",bt:"#fff",label:"BAJA",dot:"#27ae60"}
}

const COLS=[{l:"PRIORIDAD",w:105},{l:"TICKET",w:100},{l:"TIENDA",w:210},{l:"CIUDAD",w:100},{l:"FALLA",w:265},{l:"VENCE",w:110},{l:"T.REST.",w:110}]

function drawTable(
  ctx: CanvasRenderingContext2D,
  folios: ReturnType<typeof Array.prototype.filter>,
  y: number,
  W: number,
  PAD: number,
  title: string,
  titleColor: string,
  cw: number[]
) {
  const ROW_H = 52, COL_H = 34, TITLE_H = 44

  // Section title
  ctx.fillStyle = titleColor
  ctx.fillRect(0, y, W, TITLE_H)
  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 15px Arial"
  ctx.textAlign = "left"
  ctx.fillText(title, PAD, y + 28)
  y += TITLE_H

  // Col headers
  ctx.fillStyle = "#1e293b"
  ctx.fillRect(0, y, W, COL_H)
  let cx2 = PAD
  COLS.forEach((col, i) => {
    ctx.fillStyle = "#94a3b8"
    ctx.font = "bold 9px Arial"
    ctx.textAlign = "left"
    ctx.fillText(col.l, cx2 + 6, y + 22)
    cx2 += cw[i]
  })
  y += COL_H

  folios.forEach((f: any, ri: number) => {
    const secs = Math.floor((new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000)
    const rs = getRowStyle(f.prioridad, secs, f.ciudad)
    const tl = formatTiempoRestante(secs)
    ctx.fillStyle = ri % 2 === 0 ? rs.row : rs.alt
    ctx.fillRect(0, y, W, ROW_H)
    ctx.fillStyle = rs.dot
    ctx.fillRect(0, y, 4, ROW_H)
    ctx.strokeStyle = "#dee2e6"
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(W, y + ROW_H); ctx.stroke()
    let cx = PAD
    const cy = y + ROW_H / 2
    const bW = 80, bH = 20
    ctx.fillStyle = rs.badge; rr(ctx, cx + 2, cy - bH / 2, bW, bH, 4); ctx.fill()
    ctx.fillStyle = rs.bt; ctx.font = "bold 9px Arial"; ctx.textAlign = "center"
    ctx.fillText(rs.label, cx + 2 + bW / 2, cy + 3); cx += cw[0]
    ctx.fillStyle = "#1e293b"; ctx.font = "bold 10px monospace"; ctx.textAlign = "left"
    ctx.fillText(f.numero_folio, cx + 5, cy + 4); cx += cw[1]
    ctx.fillStyle = "#1e293b"; ctx.font = "12px Arial"
    ctx.fillText(trunc(f.tienda_nombre, 26), cx + 5, cy + 4); cx += cw[2]
    // Ciudad con color
    ctx.fillStyle = f.ciudad === "Rio Bravo" ? "#2563eb" : "#475569"
    ctx.font = "bold 11px Arial"
    ctx.fillText(f.ciudad, cx + 5, cy + 4); cx += cw[3]
    ctx.fillStyle = "#334155"; ctx.font = "11px Arial"
    ctx.fillText(trunc(f.falla || f.motivo, 34), cx + 5, cy + 4); cx += cw[4]
    const exp = new Date(f.fecha_vencimiento)
    ctx.fillStyle = "#475569"; ctx.font = "10px Arial"
    ctx.fillText(exp.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" }), cx + 5, cy - 4)
    ctx.fillText(exp.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }), cx + 5, cy + 9); cx += cw[5]
    ctx.font = "bold 11px Arial"; ctx.fillStyle = rs.dot
    ctx.fillText(tl, cx + 5, cy + 4)
    y += ROW_H
  })

  return y
}

export default function WhatsAppPage() {
  const { folios } = useFolios()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tick, setTick] = useState(0)

  const activos = [...folios]
    .filter(f => f.estatus !== "Cerrado" && new Date(f.fecha_vencimiento).getTime() > Date.now())
    .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())

  const urgentes = activos.filter(f => {
    const secs = (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000
    return secs < 86400
  })

  const resto = activos.filter(f => {
    const secs = (new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000
    return secs >= 86400
  })

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const DPR = 2, W = 1100
    const HEADER_H = 120, PAD = 26, FOOTER_H = 48, GAP = 20
    const ROW_H = 52, COL_H = 34, TITLE_H = 44

    const H = HEADER_H +
      (urgentes.length > 0 ? TITLE_H + COL_H + urgentes.length * ROW_H + GAP : 0) +
      (resto.length > 0 ? TITLE_H + COL_H + resto.length * ROW_H + GAP : 0) +
      FOOTER_H + PAD * 2

    canvas.width = W * DPR; canvas.height = H * DPR
    canvas.style.width = W + "px"; canvas.style.height = H + "px"
    const ctx = canvas.getContext("2d")!
    ctx.scale(DPR, DPR)

    ctx.fillStyle = "#f4f6f8"; ctx.fillRect(0, 0, W, H)

    // Header
    const g = ctx.createLinearGradient(0, 0, W, 0)
    g.addColorStop(0, "#111827"); g.addColorStop(1, "#1e3a2f")
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HEADER_H)
    ctx.fillStyle = "#22c55e"; rr(ctx, PAD, 18, 70, 70, 12); ctx.fill()
    ctx.fillStyle = "#000"; ctx.font = "bold 34px Arial"; ctx.textAlign = "center"
    ctx.fillText("C", PAD + 35, 63)
    ctx.fillStyle = "#fff"; ctx.font = "bold 22px Arial"; ctx.textAlign = "left"
    ctx.fillText("CONSTRUREY — REPORTE OXXO", PAD + 88, 46)
    const now = new Date()
    ctx.font = "13px Arial"; ctx.fillStyle = "rgba(255,255,255,.75)"
    ctx.fillText(`${now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — ${now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`, PAD + 88, 68)
    ctx.fillText(`Activos: ${activos.length}  •  Vencen hoy (<24h): ${urgentes.length}  •  Alta: ${activos.filter(f => f.prioridad === "ALTA").length}`, PAD + 88, 88)

    const TW = W - PAD * 2, cs = COLS.reduce((a, c) => a + c.w, 0)
    const cw = COLS.map(c => Math.round(c.w / cs * TW))

    let y = HEADER_H + GAP

    if (urgentes.length > 0) {
      y = drawTable(ctx, urgentes, y, W, PAD, `🔴 VENCEN EN MENOS DE 24 HORAS — ${urgentes.length} folios`, "#7f1d1d", cw)
      y += GAP
    }

    if (resto.length > 0) {
      y = drawTable(ctx, resto, y, W, PAD, `🟢 RESTO DE FOLIOS ACTIVOS — ${resto.length} folios`, "#1e3a5f", cw)
      y += GAP
    }

    // Footer
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, y, W, FOOTER_H)
    ctx.fillStyle = "#64748b"; ctx.font = "11px Arial"; ctx.textAlign = "center"
    ctx.fillText("CONSTRUREY  •  Control Operativo OXXO  •  Servicio a Clientes", W / 2, y + 30)
  }

  useEffect(() => { draw() }, [folios, tick])

  function download() {
    draw()
    setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const link = document.createElement("a")
      const now = new Date()
      link.download = `CONSTRUREY_Folios_${format(now, "yyyyMMdd_HHmm")}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      toast.success("Imagen descargada")
    }, 200)
  }

  function copyText() {
    const now = new Date()
    const lines = [
      `📋 *REPORTE CONSTRUREY — FOLIOS OXXO*`,
      `📅 ${now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })} — ${now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`,
      `Total activos: ${activos.length}  |  Vencen hoy: ${urgentes.length}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
    ]
    if (urgentes.length > 0) {
      lines.push(`\n🔴 *VENCEN EN MENOS DE 24 HORAS*`)
      urgentes.forEach(f => {
        const secs = Math.floor((new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000)
        const tl = formatTiempoRestante(secs)
        const e = f.prioridad === "ALTA" ? "🔴" : f.prioridad === "MEDIA" ? "🟡" : "🟢"
        const ciudad = f.ciudad === "Rio Bravo" ? "🔵 Rio Bravo" : "⚪ Reynosa"
        lines.push(`${e} #${f.numero_folio} | ${f.tienda_nombre} — ${ciudad}`)
        lines.push(`  ↳ ${f.falla || f.motivo || "—"}`)
        lines.push(`  ⏱ Vence en: ${tl}`)
      })
    }
    if (resto.length > 0) {
      lines.push(`\n🟢 *RESTO DE FOLIOS ACTIVOS*`)
      resto.forEach(f => {
        const secs = Math.floor((new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000)
        const tl = formatTiempoRestante(secs)
        const e = f.prioridad === "ALTA" ? "🔴" : f.prioridad === "MEDIA" ? "🟡" : "🟢"
        const ciudad = f.ciudad === "Rio Bravo" ? "🔵 Rio Bravo" : "⚪ Reynosa"
        lines.push(`${e} #${f.numero_folio} | ${f.tienda_nombre} — ${ciudad}`)
        lines.push(`  ↳ ${f.falla || f.motivo || "—"}`)
        lines.push(`  ⏱ Vence en: ${tl}`)
      })
    }
    lines.push(`\n━━━━━━━━━━━━━━━━━━━━━━\nCONSTRUREY ©️ ${now.getFullYear()}`)
    navigator.clipboard.writeText(lines.join("\n"))
    toast.success("Texto copiado al portapapeles")
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Vista WhatsApp</h1>
          <p className="text-dark-400 text-sm mt-0.5">{activos.length} folios activos — {urgentes.length} vencen hoy</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTick(t => t + 1)} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={copyText} className="btn-ghost flex items-center gap-2">
            <Copy size={14} /> Copiar texto
          </button>
          <button onClick={download} className="btn-primary flex items-center gap-2">
            <Download size={14} /> Descargar PNG
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {[["#e74c3c","Critico (<3h)"],["#e67e22","Alta"],["#f39c12","Media próxima"],["#27ae60","Baja/Estable"],["#2563eb","Rio Bravo"]].map(([c,l])=>(
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{background:c}}/>
            <span className="text-xs text-dark-400">{l}</span>
          </div>
        ))}
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 overflow-x-auto">
        <canvas ref={canvasRef} className="rounded-lg block max-w-full" />
      </div>
      <p className="text-center text-dark-500 text-xs">Imagen 2× — alta resolución para WhatsApp</p>
    </div>
  )
}
