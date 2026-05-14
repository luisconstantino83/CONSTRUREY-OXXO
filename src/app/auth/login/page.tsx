'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) { toast.error(error.message) }
      else if (data.session) { router.push('/dashboard'); router.refresh() }
    } catch { toast.error('Error inesperado') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 bg-white shadow-lg p-1">
            <Image src="/logo.png" alt="CONSTRUREY" width={72} height={72} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white">CONSTRUREY</h1>
          <p className="text-dark-400 text-sm mt-1">Control Operativo OXXO</p>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-dark-400 font-medium block mb-1.5 uppercase tracking-wide">Correo</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@construrey.com" className="input" />
            </div>
            <div>
              <label className="text-xs text-dark-400 font-medium block mb-1.5 uppercase tracking-wide">Contraseña</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 disabled:opacity-50">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
        <p className="text-center text-dark-500 text-xs mt-4">CONSTRUREY © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
