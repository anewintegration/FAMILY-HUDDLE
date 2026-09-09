import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any
    const path = req.nextUrl.pathname

    if (!token) return NextResponse.next()

    // Kids can only see their own slug page, the shared dashboard, and the
    // family whiteboard/tasks (which are open to everyone by design).
    if (token.role === 'CHILD') {
      const ownPage = `/${token.slug}`
      const allowed =
        path === '/dashboard' ||
        path === '/calendar' ||
        path === ownPage ||
        path === '/whiteboard' ||
        path === '/tasks' ||
        path.startsWith('/api')
      if (!allowed) {
        return NextResponse.redirect(new URL(ownPage, req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/calendar/:path*',
    '/family/:path*',
    '/mom-and-dad/:path*',
    '/benjamin/:path*',
    '/bradley/:path*',
    '/dad/:path*',
    '/mom/:path*',
    '/goals/:path*',
    '/bucket-list/:path*',
    '/whiteboard/:path*',
    '/tasks/:path*',
  ],
}
