import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;
    console.log(`Middleware: ${pathname} Token: ${token ? 'Found' : 'Missing'}`);

    // Define protected routes
    const protectedRoutes = ['/dashboard', '/courses', '/settings'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // Define public routes (auth routes)
    const authRoutes = ['/login', '/register', '/'];
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

    // Redirect to login if accessing protected route without token
    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        // Optional: Add return URL for better UX
        // loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Loop Fix: Allow access to auth routes even with token. 
    // This allows the client to re-login if localStorage is out of sync with cookies.
    // if (isAuthRoute && token) {
    //     return NextResponse.redirect(new URL('/dashboard', request.url));
    // }

    return NextResponse.next();
}

// Config matches all paths except static files, api, _next, and favicon
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
