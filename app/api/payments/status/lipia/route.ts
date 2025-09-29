import { NextRequest, NextResponse } from 'next/server';

const LIPIA_BASE_URL = process.env.LIPIA_BASE_URL || 'https://lipia-api.kreativelabske.com/api/v2';
const LIPIA_API_KEY = process.env.LIPIA_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!LIPIA_API_KEY) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Lipia API key not configured' 
      }, { status: 500 });
    }

    // Check API health/status
    const response = await fetch(`${LIPIA_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LIPIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    const isHealthy = response.ok;
    
    return NextResponse.json({
      status: isHealthy ? 'operational' : 'degraded',
      baseUrl: LIPIA_BASE_URL,
      responseStatus: response.status,
      message: isHealthy ? 'Lipia API is operational' : 'Lipia API may be experiencing issues',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lipia API health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      baseUrl: LIPIA_BASE_URL,
      message: 'Failed to connect to Lipia API',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}