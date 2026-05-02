import RootLayoutContent from '@/components/layout/RootLayoutContent'
import { DebateProvider } from '@/contexts/DebateContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppProvider } from '@/contexts/AppContext'
import '../styles/globals.css'

export const metadata = {
  title: 'Hermesian - Media Literacy Platform',
  description: 'Stay informed with news stories and scroll feed',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/images/Hermesian%20icon%20200x200%20%282%29.png" />
        <link rel="apple-touch-icon" href="/images/Hermesian%20icon%20200x200%20%282%29.png" />
      </head>
      <body className="bg-accent">
        <AuthProvider>
          <DebateProvider>
            <AppProvider>
              <RootLayoutContent>
                {children}
              </RootLayoutContent>
            </AppProvider>
          </DebateProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
