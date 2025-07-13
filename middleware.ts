import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

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
        const user = await getCurrentUser();

        if (user) {
          let redirectPath = '/customer/dashboard';
          switch (user.role) {
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

          // Avoid redirect loop
          if (pathname !== redirectPath) {
            return NextResponse.redirect(new URL(redirectPath, request.url));
          }
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Authentication error:', error);

    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('token');

    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('error', 'session_expired');

    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
  ],
};
