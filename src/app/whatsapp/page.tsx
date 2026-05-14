'use client'
import { useRef, useEffect, useState } from 'react'
import { useFolios } from '@/hooks/useFolios'
import { formatTiempoRestante } from '@/lib/parser'
import { format } from 'date-fns'
import { Download, Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}
function trunc(s: string | undefined | null, n: number) { return s && s.length > n ? s.slice(0,n-1)+'…' : (s||'') }
function getRowStyle(prioridad: string, estatus: string, secs: number) {
  if (estatus==='Vencido'||secs<=0) return {row:'#fff0f0',badge:'#c0392b',bt:'#fff',label:'VENCIDO',dot:'#c0392b'}
  if (prioridad==='ALTA'&&secs<10800) return {row:'#fff2f0',badge:'#e74c3c',bt:'#fff',label:'CRÍTICO',dot:'#e74c3c'}
  if (prioridad==='ALTA') return {row:'#fff5ee',badge:'#e67e22',bt:'#fff',label:'ALTA',dot:'#e67e22'}
  if (prioridad==='MEDIA'&&secs<86400) return {row:'#fffce6',badge:'#f39c12',bt:'#fff',label:'MEDIA',dot:'#f39c12'}
  if (prioridad==='MEDIA') return {row:'#fefff0',badge:'#d4ac0d',bt:'#333',label:'MEDIA',dot:'#d4ac0d'}
  return {row:'#f0fff4',badge:'#27ae60',bt:'#fff',label:'BAJA',dot:'#27ae60'}
}

export default function WhatsAppPage() {
  const { folios } = useFolios()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tick, setTick] = useState(0)

  const urgentes = [...folios]
    .filter(f => f.estatus !== 'Cerrado')
    .sort((a,b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const DPR=2, W=1100
    const HEADER_H=120, COL_H=34, ROW_H=52, CITY_H=38, GAP=14, PAD=26, FOOTER_H=48
    const ciudades = ['Reynosa','Río Bravo']
    let rows = 0
    ciudades.forEach(c => { if (urgentes.filter(f=>f.ciudad===c).length) rows += urgentes.filter(f=>f.ciudad===c).length+1 })
    const H = HEADER_H+COL_H+rows*ROW_H+ciudades.length*GAP+FOOTER_H+PAD*2
    canvas.width = W*DPR; canvas.height = H*DPR
    canvas.style.width = W+'px'; canvas.style.height = H+'px'
    const ctx = canvas.getContext('2d')!
    ctx.scale(DPR, DPR)

    // BG
    ctx.fillStyle='#f4f6f8'; ctx.fillRect(0,0,W,H)
    // Header gradient
    const g = ctx.createLinearGradient(0,0,W,0)
    g.addColorStop(0,'#111827'); g.addColorStop(1,'#1e3a2f')
    ctx.fillStyle=g; ctx.fillRect(0,0,W,HEADER_H)
    // Logo box
    ctx.fillStyle='#22c55e'; rr(ctx,PAD,18,70,70,12); ctx.fill()
    ctx.fillStyle='#000'; ctx.font='bold 34px Arial'; ctx.textAlign='center'; ctx.fillText('C',PAD+35,63)
    // Title
    ctx.fillStyle='#fff'; ctx.font='bold 22px Arial'; ctx.textAlign='left'
    ctx.fillText('CONSTRUREY — REPORTE OXXO',PAD+88,46)
    const now = new Date()
    ctx.font='13px Arial'; ctx.fillStyle='rgba(255,255,255,.75)'
    ctx.fillText(`${now.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} — ${now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`,PAD+88,68)
    ctx.fillText(`Activos: ${urgentes.length}  •  Vencidos: ${urgentes.filter(f=>f.estatus==='Vencido').length}  •  Alta: ${urgentes.filter(f=>f.prioridad==='ALTA').length}`,PAD+88,88)

    // Col headers
    const COLS=[{l:'PRIORIDAD',w:105},{l:'TICKET',w:100},{l:'TIENDA',w:210},{l:'CIUDAD',w:100},{l:'FALLA',w:265},{l:'VENCE',w:110},{l:'T.REST.',w:110}]
    const TW=W-PAD*2, cs=COLS.reduce((a,c)=>a+c.w,0)
    const cw=COLS.map(c=>Math.round(c.w/cs*TW))
    let y=HEADER_H
    ctx.fillStyle='#1e293b'; ctx.fillRect(0,y,W,COL_H)
    let cx2=PAD
    COLS.forEach((col,i)=>{ ctx.fillStyle='#94a3b8'; ctx.font='bold 9px Arial'; ctx.textAlign='left'; ctx.fillText(col.l,cx2+6,y+22); cx2+=cw[i] })
    y+=COL_H

    ciudades.forEach(ciudad=>{
      const rows2=urgentes.filter(f=>f.ciudad===ciudad)
      if(!rows2.length) return
      y+=GAP
      ctx.fillStyle='#0f172a'; ctx.fillRect(0,y,W,CITY_H)
      ctx.fillStyle='#e2e8f0'; ctx.font='bold 13px Arial'; ctx.textAlign='left'
      ctx.fillText(`  📍  ${ciudad.toUpperCase()}   —   ${rows2.length} folio${rows2.length!==1?'s':''}`,PAD,y+25)
      y+=CITY_H
      rows2.forEach((f,ri)=>{
        const secs=Math.floor((new Date(f.fecha_vencimiento).getTime()-Date.now())/1000)
        const rs=getRowStyle(f.prioridad,f.estatus,secs)
        const tl=formatTiempoRestante(secs)
        ctx.fillStyle=ri%2===0?rs.row:'#f9f9f9'; ctx.fillRect(0,y,W,ROW_H)
        ctx.fillStyle=rs.dot; ctx.fillRect(0,y,4,ROW_H)
        ctx.strokeStyle='#dee2e6'; ctx.lineWidth=0.5
        ctx.beginPath(); ctx.moveTo(0,y+ROW_H); ctx.lineTo(W,y+ROW_H); ctx.stroke()
        let cx=PAD; const cy=y+ROW_H/2
        const bW=80,bH=20
        ctx.fillStyle=rs.badge; rr(ctx,cx+2,cy-bH/2,bW,bH,4); ctx.fill()
        ctx.fillStyle=rs.bt; ctx.font='bold 9px Arial'; ctx.textAlign='center'; ctx.fillText(rs.label,cx+2+bW/2,cy+3); cx+=cw[0]
        ctx.fillStyle='#1e293b'; ctx.font='bold 10px monospace'; ctx.textAlign='left'; ctx.fillText(f.numero_folio,cx+5,cy+4); cx+=cw[1]
        ctx.fillStyle='#1e293b'; ctx.font='12px Arial'; ctx.fillText(trunc(f.tienda_nombre,26),cx+5,cy+4); cx+=cw[2]
        ctx.fillStyle='#475569'; ctx.font='11px Arial'; ctx.fillText(f.ciudad,cx+5,cy+4); cx+=cw[3]
        ctx.fillStyle='#334155'; ctx.font='11px Arial'; ctx.fillText(trunc(f.falla||f.motivo,34),cx+5,cy+4); cx+=cw[4]
        const exp=new Date(f.fecha_vencimiento)
        ctx.fillStyle='#475569'; ctx.font='10px Arial'
        ctx.fillText(exp.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'}),cx+5,cy-4)
        ctx.fillText(exp.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}),cx+5,cy+9); cx+=cw[5]
        ctx.font='bold 11px Arial'; ctx.fillStyle=secs<=0?'#c0392b':rs.dot
        ctx.fillText(secs<=0?'⚠ VENCIDO':tl,cx+5,cy+4)
        y+=ROW_H
      })
    })
    // Footer
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,y+8,W,FOOTER_H)
    ctx.fillStyle='#64748b'; ctx.font='11px Arial'; ctx.textAlign='center'
    ctx.fillText('CONSTRUREY  •  Control Operativo OXXO  •  Servicio a Clientes',W/2,y+8+30)
  }

  useEffect(() => { draw() }, [folios, tick])

  function download() {
    draw()
    setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const link = document.createElement('a')
      const now = new Date()
      link.download = `CONSTRUREY_Folios_${format(now,'yyyyMMdd_HHmm')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Imagen descargada')
    }, 200)
  }

  function copyText() {
    const now = new Date()
    const lines = [
      `📋 *REPORTE CONSTRUREY — FOLIOS OXXO*`,
      `📅 ${now.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})} — ${now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}`,
      `Total activos: ${urgentes.length}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
    ]
    ;['Reynosa','Río Bravo'].forEach(ciudad => {
      const rows = urgentes.filter(f => f.ciudad === ciudad)
      if (!rows.length) return
      lines.push(`\n📍 *${ciudad.toUpperCase()}*`)
      ;['ALTA','MEDIA','BAJA'].forEach(pri => {
        const sub = rows.filter(f => f.prioridad === pri)
        if (!sub.length) return
        const e = pri==='ALTA'?'🔴':pri==='MEDIA'?'🟡':'🟢'
        lines.push(`${e} *${pri}*`)
        sub.forEach(f => {
          const secs = Math.floor((new Date(f.fecha_vencimiento).getTime() - Date.now()) / 1000)
          const tl = formatTiempoRestante(secs)
          lines.push(`• Ticket #${f.numero_folio} | ${f.tienda_nombre}`)
          lines.push(`  ↳ ${f.falla || f.motivo || '—'}`)
          lines.push(`  ⏱ ${secs<=0?'⚠ VENCIDO':'Vence en: '+tl}`)
        })
      })
    })
    lines.push(`\n━━━━━━━━━━━━━━━━━━━━━━\nCONSTRUREY © ${now.getFullYear()}`)
    navigator.clipboard.writeText(lines.join('\n'))
    toast.success('Texto copiado al portapapeles')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Vista WhatsApp</h1>
          <p className="text-dark-400 text-sm mt-0.5">{urgentes.length} folios activos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTick(t=>t+1)} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={14}/> Actualizar
          </button>
          <button onClick={copyText} className="btn-ghost flex items-center gap-2">
            <Copy size={14}/> Copiar texto
          </button>
          <button onClick={download} className="btn-primary flex items-center gap-2">
            <Download size={14}/> Descargar PNG
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {[['#c0392b','Vencido'],['#e67e22','Alta'],['#f39c12','Media próxima'],['#27ae60','Baja/Estable']].map(([c,l])=>(
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
