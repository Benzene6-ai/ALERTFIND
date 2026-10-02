import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('supabase-auth-token')?.value ||
    request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF}-auth-token`)?.value

  const isLoggedIn = !!token
  const path = request.nextUrl.pathname

  if (!isLoggedIn && path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isLoggedIn && path === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/cases/:path*', '/report/:path*'],
}