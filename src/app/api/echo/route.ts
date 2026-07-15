import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  logger.debug("handle api/echo yo");
  try {
    const body = await req.json();
    return NextResponse.json({
      receivedRequestInit: body,
    });
  } catch {
    logger.debug("api/echo err");
    return NextResponse.json(
      { error: "Invalid JSON or request body" },
      { status: 400 },
    );
  }
}
