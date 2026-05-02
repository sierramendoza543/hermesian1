'use client'

import Navbar from '@/components/Navbar'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={inter.className}>
      <Navbar />
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  )
} 