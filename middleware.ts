import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define paths that don't need auth check
const publicPaths = ['/', '/login', '/signup', '/debates']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Debug logs
  console.log('Current path:', pathname)

  // Skip middleware for API routes
  if (pathname.startsWith('/api')) {
    console.log('API path, allowing access')
    return NextResponse.next()
  }

  // Skip middleware for public paths and debate paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    console.log('Public path, allowing access')
    return NextResponse.next()
  }

  // For all other paths, check auth
  const session = request.cookies.get('__session')?.value
  console.log('Session present:', !!session)

  if (!session) {
    console.log('No session, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 