import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth'; // make sure this is edge-safe

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
            return NextResponse.redirect(new URL(redirectPath, request.url));
          }
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (pathname !== '/auth/login') {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('error', 'session_expired');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');
      return response;
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
  ],
};
