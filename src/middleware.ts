import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public paths that don't require authentication
const publicPaths = ['/login', '/signup', '/']

function isUnexpiredJwt(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Allow API routes
  if (path.startsWith('/api')) {
    return NextResponse.next()
  }
  
  // Allow public paths
  if (publicPaths.includes(path)) {
    return NextResponse.next()
  }

  // Check for a Firebase ID token that is well-formed and unexpired.
  // This does NOT verify the signature (firebase-admin can't run on the Edge
  // runtime), so it only gates page navigation. Real authorization must
  // happen where data is read/written (Firestore security rules).
  const session = request.cookies.get('__session')?.value

  if (!session || !isUnexpiredJwt(session)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', path)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
} 