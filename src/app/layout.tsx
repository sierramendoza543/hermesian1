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
  title: { default: 'Hermesian — See every side of the story', template: '%s | Hermesian' },
  description:
    'Hermesian groups coverage from dozens of outlets into single stories, maps them on the political spectrum, and uses AI to expose bias with quotes and evidence.',
  icons: {
    icon: '/images/Hermesian%20icon%20200x200%20%282%29.png',
    apple: '/images/Hermesian%20icon%20200x200%20%282%29.png',
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
      <body className="min-h-screen bg-paper font-sans text-ink">
        <AuthProvider>
          <RootLayoutContent>{children}</RootLayoutContent>
        </AuthProvider>
      </body>
    </html>
  )
}
