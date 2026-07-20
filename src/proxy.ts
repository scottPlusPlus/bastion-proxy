import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";

  // Handle preflight
  if (request.method === "OPTIONS") {
    return NextResponse.json(
      {},
      {
        headers: {
          "Access-Control-Allow-Origin": origin || "*",
          ...CORS_HEADERS,
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/project/:id/env/:path*",
};
