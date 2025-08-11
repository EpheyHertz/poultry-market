import { NextRequest } from "next/server";

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8000";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Helper function to get headers for FastAPI requests
function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (ADMIN_API_KEY) {
    headers["X-API-Key"] = ADMIN_API_KEY;
  }
  
  return headers;
}

// GET endpoint for fetching data from FastAPI
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return new Response(
        JSON.stringify({ error: "Missing 'path' parameter" }), 
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // Clean up the path to ensure it starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fastApiUrl = `${FASTAPI_BASE_URL}${cleanPath}`;
    
    console.log(`Proxying GET request to: ${fastApiUrl}`);

    const response = await fetch(fastApiUrl, {
      method: 'GET',
      headers: getHeaders(),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 
        "content-type": "application/json",
        // Add CORS headers if needed
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      },
    });

  } catch (error) {
    console.error('Proxy GET error:', error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch from FastAPI backend",
        details: error instanceof Error ? error.message : String(error)
      }), 
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
}

// POST endpoint for sending data to FastAPI
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return new Response(
        JSON.stringify({ error: "Missing 'path' parameter" }), 
        { 
          status: 400,
          headers: { "content-type": "application/json" }
        }
      );
    }

    const body = await req.text();
    
    // Clean up the path to ensure it starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fastApiUrl = `${FASTAPI_BASE_URL}${cleanPath}`;
    
    console.log(`Proxying POST request to: ${fastApiUrl}`);

    const response = await fetch(fastApiUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: body,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      },
    });

  } catch (error) {
    console.error('Proxy POST error:', error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to post to FastAPI backend",
        details: error instanceof Error ? error.message : String(error)
      }), 
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
}

// OPTIONS endpoint for CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}
