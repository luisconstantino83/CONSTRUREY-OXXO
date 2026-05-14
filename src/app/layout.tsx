import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CONSTRUREY — Control OXXO',
  description: 'Plataforma de control operativo de folios OXXO',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'CONSTRUREY' },
}

export const viewport: Viewport = {
  themeColor: '#090f1a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-dark-950 text-dark-50 antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: { background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9' },
          }}
        />
      </body>
    </html>
  )
}
