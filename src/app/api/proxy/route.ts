import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger/logger";
import {
  isValidRequestInit,
  injectRequestData,
  sanitizeResponseBody,
  InjectedRequestData,
} from "@/lib/proxy/utils";
import { validUserFromReq } from "@/lib/auth/api-auth";

export async function POST(req: NextRequest) {
  logger.debug(`handle api/proxy`);
  try {
    const body = await req.json();
    const fetchUrl: string = body.fetchUrl;
    const fetchData: RequestInit = body.requestInit ?? null;
    const secretKeys: Array<string> = body.secretKeys ?? [];

    const user = await validUserFromReq(req);
    if (!user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }
    if (!fetchUrl) {
      return NextResponse.json({ error: "Missing fetchUrl" }, { status: 400 });
    }
    if (fetchData && !isValidRequestInit(fetchData)) {
      return NextResponse.json(
        { error: "Invalid fetch data" },
        { status: 401 },
      );
    }

    let injectedData: InjectedRequestData;
    try {
      injectedData = await injectRequestData(
        fetchUrl,
        fetchData,
        secretKeys,
        envVarReplacer,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`api/proxy error from replaceRequestData: ${message}`);
      return NextResponse.json({ error: "Error: " + message }, { status: 400 });
    }

    const logData = { user: user, targetUrl: fetchUrl, keys: secretKeys };
    logger.info(`Proxy`, logData);

    const res = await fetch(injectedData.url, injectedData.requestInit);
    logger.debug(
      `Proxy has response from ${fetchUrl}, status: ${res.status}`,
    );

    // Check content length before reading
    const contentLength = res.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength) > 10_000_000) {
      logger.error(
        `Response too large: ${contentLength} bytes from ${fetchUrl}`,
      );
      return NextResponse.json(
        { error: "Response too large" },
        { status: 413 },
      );
    }

    // Read response body as a buffer, remove any secrets we injected
    const startBuffer = Date.now();
    const responseBodyBuffer = await res.arrayBuffer();
    logger.debug(
      `Proxy: arrayBuffer read in ${Date.now() - startBuffer}ms, size: ${responseBodyBuffer.byteLength} bytes`,
    );

    const startSanitize = Date.now();
    const contentType = res.headers.get("Content-Type") || "";
    const bodyToReturn = sanitizeResponseBody(
      responseBodyBuffer,
      injectedData.secretValues,
      contentType,
    );
    logger.debug(`Proxy: sanitized in ${Date.now() - startSanitize}ms`);

    const headers = fixHeaders(res.headers, bodyToReturn);

    logger.debug(`Proxy: about to return response`);
    return new NextResponse(bodyToReturn, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Proxy exception: ${message}`);
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  } finally {
    logger.debug(`Proxy: function complete`);
  }
}

/**
 * Clone headers from the fetched response, but exclude problematic ones
 * Skip headers that don't apply when we're buffering/re-encoding the response
 * Set correct content-length for the buffered response
 */
function fixHeaders(
  responseHeaders: Headers,
  body: string | ArrayBuffer,
): Headers {
  // Clone headers from the fetched response, but exclude problematic ones
  const headers = new Headers();
  responseHeaders.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    // Skip headers that don't apply when we're buffering/re-encoding the response
    if (
      lowerKey === "content-encoding" ||
      lowerKey === "transfer-encoding" ||
      lowerKey === "content-length"
    ) {
      return;
    }
    headers.set(key, value);
  });

  // Set correct content-length for the buffered response
  const bodySize =
    typeof body === "string"
      ? new TextEncoder().encode(body).length
      : body.byteLength;
  headers.set("Content-Length", bodySize.toString());

  return headers;
}

async function envVarReplacer(key: string): Promise<string> {
  const val = process.env[key];
  if (!val || val.length == 0) {
    throw new Error(`no env var "${key}"`);
  }
  return val;
}
