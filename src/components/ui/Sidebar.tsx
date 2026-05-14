'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Flame, BarChart3, Users, MessageSquare, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types'

const NAV = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/folios',     icon: FileText,        label: 'Folios'     },
  { href: '/super-heat', icon: Flame,           label: 'Super Heat' },
  { href: '/reportes',   icon: BarChart3,       label: 'Reportes'   },
  { href: '/tecnicos',   icon: Users,           label: 'Técnicos'   },
  { href: '/whatsapp',   icon: MessageSquare,   label: 'WhatsApp'   },
]

export function Sidebar({ user }: { user: Usuario | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white flex items-center justify-center p-0.5">
            <Image src="/logo.png" alt="CONSTRUREY" width={36} height={36} className="object-contain" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">CONSTRUREY</div>
            <div className="text-xs text-dark-400 mt-0.5">Control OXXO</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'text-dark-400 hover:text-dark-100 hover:bg-dark-700'}`}>
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-dark-700">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-dark-200">{user.nombre?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-dark-100 truncate">{user.nombre}</div>
              <div className="text-xs text-dark-500 capitalize">{user.rol}</div>
            </div>
          </div>
        )}
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-dark-800 border border-dark-600 rounded-lg flex items-center justify-center">
        {open ? <X size={16} /> : <Menu size={16} />}
      </button>
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-dark-900 border-r border-dark-700 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {navContent}
      </aside>
      <aside className="hidden lg:flex flex-col w-56 fixed inset-y-0 left-0 bg-dark-900 border-r border-dark-700 z-30">
        {navContent}
      </aside>
    </>
  )
}
