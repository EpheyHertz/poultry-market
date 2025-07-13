// middleware.ts
import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedAuthRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
  ];

  // Check if current route is a protected auth route
  const isProtectedAuthRoute = protectedAuthRoutes.some(route => 
    pathname.startsWith(route)
  );

  try {
    if (isProtectedAuthRoute) {
      const token = request.cookies.get('token')?.value;
      
      if (token) {
        const user = await getCurrentUser();

        if (user) {
          // Redirect to appropriate dashboard if authenticated
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

          return NextResponse.redirect(new URL(redirectPath, request.url));
        }
      }
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Create response that clears invalid token
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('token');
    
    // Add error message to URL if needed
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