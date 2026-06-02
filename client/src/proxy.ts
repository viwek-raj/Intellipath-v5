import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const userRole = request.cookies.get('userRole')?.value;
    const accountStatus = request.cookies.get('accountStatus')?.value;
    const { pathname } = request.nextUrl;

    // Define protected routes
    const protectedRoutes = ['/dashboard', '/courses', '/settings', '/batches', '/admin', '/instructor'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // Status-specific pages
    const isPendingPage = pathname === '/pending';
    const isDismissedPage = pathname === '/dismissed';

    // Redirect to login if accessing protected route without token
    if (isProtectedRoute && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect to login if accessing status pages without token
    if ((isPendingPage || isDismissedPage) && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-based route protection (only if we have role info from cookie)
    if (token && userRole) {
        // Admin routes — admin only
        if (pathname.startsWith('/admin') && userRole !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // Instructor routes — instructor only
        if (pathname.startsWith('/instructor') && userRole !== 'instructor') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // Pending/dismissed — redirect approved users away from status pages
        if (isPendingPage && accountStatus === 'approved') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        if (isDismissedPage && accountStatus !== 'dismissed') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

// Config matches all paths except static files, api, _next, and favicon
export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
