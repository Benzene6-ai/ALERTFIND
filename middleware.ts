import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Check for any supabase auth cookie (the name varies by project)
  const cookies = request.cookies.getAll()
  const isLoggedIn = cookies.some(
    c => c.name.includes('auth-token') || c.name.includes('sb-')
  )

  // Not logged in trying to access protected page → send to login
  if (!isLoggedIn && path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Logged in trying to access login page → send to dashboard
  if (isLoggedIn && path === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}