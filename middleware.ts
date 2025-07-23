import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth'; // Ensure this works in Edge runtime

export const config = {
  matcher: [
    '/api/:path*',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
  ],
};

const allowedOrigins =['http://localhost:3000', 'http://localhost:8081','https://poultrymarketke.vercel.app']

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  const { pathname } = request.nextUrl;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : 'null',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
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
          let redirectPath = '/customer/dashboard';

          switch (payload.userRole) {
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
            if (isAllowedOrigin) {
              response.headers.set('Access-Control-Allow-Origin', origin);
              response.headers.set('Access-Control-Allow-Credentials', 'true');
            }
            return response;
          }
        }
      }
    }

    const response = NextResponse.next();
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;

  } catch (error) {
    console.error('Auth error in middleware:', error);

    if (pathname !== '/auth/login') {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('error', 'session_expired');

      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');

      if (isAllowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      return response;
    }

    const response = NextResponse.next();
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
  }
}
