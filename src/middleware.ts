import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public paths that don't require authentication
const publicPaths = ['/login', '/signup', '/']

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

  // Check for Firebase auth session cookie
  const session = request.cookies.get('__session')?.value

  // If no session, redirect to login
  if (!session) {
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