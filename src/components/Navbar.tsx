'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Newspaper, ScanSearch, Gamepad2, GraduationCap, Play, LogOut, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Stories', href: '/', icon: Newspaper },
  { name: 'Analyze', href: '/analyze', icon: ScanSearch },
  { name: 'Games', href: '/games', icon: Gamepad2 },
  { name: 'Videos', href: '/scroll-feed', icon: Play },
  { name: 'Learn', href: '/learn', icon: GraduationCap },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => (href === '/' ? pathname === '/' || pathname.startsWith('/story') : pathname.startsWith(href))
  const initials = (user?.displayName || user?.email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  const handleLogout = async () => {
    try {
      await logout()
      setOpen(false)
      router.push('/')
    } catch {}
  }

  return (
    <nav className="no-print sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image
            src="/images/Hermesian%20icon%20200x200%20%282%29.png"
            alt="Hermesian"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg"
            priority
          />
          <span className="font-headline text-xl font-black tracking-tight text-ink">Hermesian</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.href) ? 'bg-ink text-white' : 'text-ink/70 hover:bg-accent/60 hover:text-ink'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-sm font-medium hover:border-primary"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {initials}
                </span>
                Profile
              </Link>
              <button onClick={handleLogout} className="rounded-lg p-2 text-muted hover:bg-accent/60 hover:text-ink" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn-ghost !py-2">Sign in</Link>
              <Link href="/signup" className="btn-primary !py-2">Create account</Link>
            </div>
          )}
          <button
            className="rounded-lg p-2 text-ink hover:bg-accent/60 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-paper px-4 pb-4 pt-2 lg:hidden">
          <div className="grid gap-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(item.href) ? 'bg-ink text-white' : 'text-ink hover:bg-accent/60'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
            <div className="my-2 border-t border-line" />
            {user ? (
              <>
                <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent/60">
                  <User className="h-4 w-4" /> Profile
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent/60">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" onClick={() => setOpen(false)} className="btn-ghost flex-1">Sign in</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="btn-primary flex-1">Create account</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
