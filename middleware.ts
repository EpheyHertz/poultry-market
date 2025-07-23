import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:3000',
  'https://poultrymarketke.vercel.app',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const { pathname } = request.nextUrl;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const protectedAuthRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
  ];

  const isProtectedAuthRoute = protectedAuthRoutes.some(route =>
    pathname.startsWith(route)
  );

  try {
    if (isProtectedAuthRoute) {
      const token = request.cookies.get('token')?.value;

      if (token) {
        const payload = await verifyToken(token);

        if (payload) {
          const role = payload.userRole;
          let redirectPath = '/customer/dashboard';

          switch (role) {
            case 'ADMIN':
              redirectPath = '/admin/dashboard';
              break;
            case 'SELLER':
              redirectPath = '/seller/dashboard';
              break;
            case 'COMPANY':
              redirectPath = '/company/dashboard';
              break;
            case 'STAKEHOLDER':
              redirectPath = '/stakeholder/dashboard';
              break;
            case 'DELIVERY_AGENT':
              redirectPath = '/delivery-agent/dashboard';
              break;
          }

          if (pathname !== redirectPath) {
            const response = NextResponse.redirect(new URL(redirectPath, request.url));
            Object.entries(corsHeaders).forEach(([key, value]) =>
              response.headers.set(key, value)
            );
            return response;
          }
        }
      }
    }

    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) =>
      response.headers.set(key, value)
    );
    return response;

  } catch (error) {
    console.error('Auth error in middleware:', error);

    if (pathname !== '/auth/login') {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('error', 'session_expired');

      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');
      Object.entries(corsHeaders).forEach(([key, value]) =>
        response.headers.set(key, value)
      );
      return response;
    }

    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) =>
      response.headers.set(key, value)
    );
    return response;
  }
}

export const config = {
  matcher: [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/api/:path*',
  ],
};
