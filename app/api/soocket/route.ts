import { NextRequest, NextResponse } from "next/server";

function getEnv() {
  return (globalThis as any)?.process?.env ?? {};
}

// Utility to build WS URL to FastAPI backend, based on env or sensible defaults
function buildWsUrl(req: NextRequest) {
  const url = new URL(req.url);
  const threadId = url.searchParams.get("thread_id") || "";
  const backendOverride = url.searchParams.get("backend") || "";

  const env = getEnv();
  const envBase = env.NEXT_PUBLIC_BACKEND_BASE_URL || env.BACKEND_BASE_URL || "";
  // Only read server-side secrets here, do NOT use NEXT_PUBLIC_* for keys
  const apiKey = env.ADMIN_API_KEY || env.X_API_KEY || "";

  const httpBase = (backendOverride || envBase || "http://localhost:8000").replace(/\/$/, "");
  const isHttps = httpBase.startsWith("https://");
  const wsScheme = isHttps ? "wss" : "ws";

  const qp = new URLSearchParams();
  if (threadId) qp.set("thread_id", threadId);
  if (apiKey) qp.set("x_api_key", apiKey);

  const wsUrl = `${wsScheme}://${httpBase.replace(/^https?:\/\//, "")}/ws/chat${qp.toString() ? `?${qp.toString()}` : ""}`;
  return wsUrl;
}

export async function GET(req: NextRequest) {
  const wsUrl = buildWsUrl(req);
  return NextResponse.json({ url: wsUrl });
}

export const dynamic = "force-dynamic";
