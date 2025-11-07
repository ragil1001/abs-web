// src/middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // For now, let the client-side handle authentication
  // This middleware can be extended for server-side route protection
  return NextResponse.next();
}

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