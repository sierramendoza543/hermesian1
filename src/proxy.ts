import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Only the personal dashboard needs an account; everything else (stories,
// analyzer, games) works for guests.
const protectedPaths = ['/profile']

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

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (!protectedPaths.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.next()
  }

  // Presence/expiry check only - the signature can't be verified on the Edge
  // runtime, so real authorization lives in Firestore security rules.
  const session = request.cookies.get('__session')?.value
  if (!session || !isUnexpiredJwt(session)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', path)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images).*)'],
}
