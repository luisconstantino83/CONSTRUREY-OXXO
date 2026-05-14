'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types'

export function useAuth() {
  const [user, setUser]       = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: au } }) => {
      if (au) {
        const { data } = await supabase.from('usuarios').select('*').eq('id', au.id).single()
        setUser(data as Usuario)
      }
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const { data } = await supabase.from('usuarios').select('*').eq('id', session.user.id).single()
        setUser(data as Usuario)
      } else {
        setUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  return { user, loading }
}
