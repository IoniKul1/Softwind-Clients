import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Website Content Manager',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-brand-black text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
