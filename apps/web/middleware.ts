import { NextResponse, type NextRequest } from 'next/server';
import { contentSecurityPolicy } from './lib/content-security-policy';

export function middleware(request: NextRequest) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  const policy = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV !== 'production',
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  );
  const requestHeaders = new Headers(request.headers);
  // Never trust a nonce supplied by the caller.
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|visuals/).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
