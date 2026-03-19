import { NextRequest } from "next/server";

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL || process.env.BACKEND_BASE_URL || "http://localhost:8000";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.X_API_KEY;

function getHeaders() {
  const headers: Record<string, string> = {};

  if (ADMIN_API_KEY) {
    headers["X-API-Key"] = ADMIN_API_KEY;
  }

  return headers;
}

async function parseUpstreamResponse(response: Response) {
  const raw = await response.text();
  try {
    return {
      parsed: JSON.parse(raw),
      raw,
      isJson: true,
    };
  } catch {
    return {
      parsed: null,
      raw,
      isJson: false,
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
      return new Response(JSON.stringify({ error: "Missing 'path' parameter" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const fastApiUrl = `${FASTAPI_BASE_URL}${cleanPath}`;

    const response = await fetch(fastApiUrl, {
      method: "GET",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
    });

    const { parsed, raw, isJson } = await parseUpstreamResponse(response);

    const payload = isJson
      ? parsed
      : {
          status: response.status,
          detail: raw || "Empty upstream response",
        };

    return new Response(JSON.stringify(payload), {
      status: response.status,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch from FastAPI backend",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
      return new Response(JSON.stringify({ error: "Missing 'path' parameter" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const incomingContentType = req.headers.get("content-type") || "application/json";
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const fastApiUrl = `${FASTAPI_BASE_URL}${cleanPath}`;

    let response: Response;

    if (incomingContentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      response = await fetch(fastApiUrl, {
        method: "POST",
        headers: getHeaders(),
        body: formData,
      });
    } else {
      const body = await req.text();
      response = await fetch(fastApiUrl, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body,
      });
    }

    const { parsed, raw, isJson } = await parseUpstreamResponse(response);

    const payload = isJson
      ? parsed
      : {
          status: response.status,
          detail: raw || "Empty upstream response",
        };

    return new Response(JSON.stringify(payload), {
      status: response.status,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to post to FastAPI backend",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}
