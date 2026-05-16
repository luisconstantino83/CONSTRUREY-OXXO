import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: usuario } = await supabase
    .from('usuarios').select('*').eq('id', user.id).single()

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar user={usuario} />
      <main className="flex-1 lg:ml-56 p-4 lg:p-6 max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
