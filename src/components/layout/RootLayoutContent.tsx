'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/layout/Footer'

export default function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const immersive = pathname === '/scroll-feed'
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!immersive && <Footer />}
    </div>
  )
}
