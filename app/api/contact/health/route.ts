import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if required environment variables are set
    const requiredEnvVars = ['GMAIL_USER', 'GMAIL_APP_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        status: 'error',
        message: 'Email service not configured',
        missing: missingVars,
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Contact API is ready',
      timestamp: new Date().toISOString(),
      services: {
        email: 'configured',
        rateLimit: 'active',
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    error: 'Method not allowed. Use GET for health check.',
  }, { status: 405 });
}
