import type { Metadata, Viewport } from 'next'
import { Inter, Merriweather } from 'next/font/google'
import RootLayoutContent from '@/components/layout/RootLayoutContent'
import { AuthProvider } from '@/contexts/AuthContext'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-merriweather',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Hermesian: see every side of the story', template: '%s | Hermesian' },
  description: 'Compare how different news outlets cover the same story, see where each one falls on the political spectrum, and check any article for bias.',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1c1620',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${merriweather.variable}`}>
      <body className="min-h-screen bg-cream font-sans text-charcoal">
        <AuthProvider>
          <RootLayoutContent>{children}</RootLayoutContent>
        </AuthProvider>
      </body>
    </html>
  )
}
