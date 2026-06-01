import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/ui/Sidebar"
import type { Usuario } from "@/types"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: usuario } = await supabase
    .from("usuarios").select("*").eq("id", user.id).single()

  return (
    <div className="flex min-h-screen bg-dark-950 overflow-x-hidden">
      <Sidebar user={usuario as Usuario} />
      <main className="flex-1 lg:ml-56 min-h-screen w-0 min-w-0">
        <div className="p-3 lg:p-6 w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
