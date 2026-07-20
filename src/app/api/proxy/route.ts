import { after, NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger/logger";
import {
  isValidRequestInit,
  injectRequestData,
  sanitizeResponseBody,
  InjectedRequestData,
} from "@/lib/proxy/utils";
import { getGoogleAccessToken } from "@/lib/proxy/google-auth";
import { getProjectFromReq } from "@/lib/proxy/get-project";
import { writeAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  logger.debug(`handle api/proxy`);
  const requestBytes = req.headers.get("content-length")
    ? parseInt(req.headers.get("content-length")!)
    : null;
  try {
    const body = await req.json();
    const fetchUrl: string = body.fetchUrl;
    const fetchData: RequestInit = body.requestInit ?? null;
    const secretKeys: Array<string> = body.secretKeys ?? [];
    const googleAuth: { credentialsKey: string; scopes: string[] } | undefined =
      body.googleAuth;

    const project = await getProjectFromReq(req);
    if (!project) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    if (!hasPermission(project.apiKeyPermissions, "ENV", "READ")) {
      return NextResponse.json(
        { error: "This API key does not have proxy access" },
        { status: 403 },
      );
    }
    if (!fetchUrl) {
      return NextResponse.json({ error: "Missing fetchUrl" }, { status: 400 });
    }
    if (fetchData && !isValidRequestInit(fetchData)) {
      return NextResponse.json({ error: "Invalid fetch data" }, { status: 400 });
    }

    let injectedData: InjectedRequestData;
    try {
      injectedData = await injectRequestData(
        fetchUrl,
        fetchData,
        secretKeys,
        (key) => resolveEnvVar(key, project.envVars),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`api/proxy error from injectRequestData: ${message}`);
      return NextResponse.json({ error: "Error: " + message }, { status: 400 });
    }

    // All env var keys accessed during this request (secretKeys + googleAuth credential)
    const accessedKeys: string[] = [...secretKeys];

    if (googleAuth?.credentialsKey) {
      const envVar = project.envVars.find((v) => v.key === googleAuth.credentialsKey);
      if (!envVar) {
        return NextResponse.json(
          { error: `No env var "${googleAuth.credentialsKey}" for this project` },
          { status: 400 },
        );
      }
      const token = await getGoogleAccessToken(envVar.value, googleAuth.scopes ?? []);
      injectedData = {
        url: injectedData.url,
        requestInit: {
          ...(injectedData.requestInit ?? {}),
          headers: {
            ...((injectedData.requestInit?.headers as Record<string, string>) ?? {}),
            Authorization: `Bearer ${token}`,
          },
        },
        secretValues: [...injectedData.secretValues, token],
      };
      accessedKeys.push(googleAuth.credentialsKey);
    }

    logger.info(`Proxy`, { project: project.name, targetUrl: fetchUrl, keys: accessedKeys });

    const res = await fetch(injectedData.url, injectedData.requestInit);
    logger.debug(`Proxy has response from ${fetchUrl}, status: ${res.status}`);

    const contentType = res.headers.get("Content-Type") || "";
    const isTextBased =
      contentType.includes("text") ||
      contentType.includes("json") ||
      contentType.includes("xml");

    if (!isTextBased) {
      // Binary response — stream directly, no buffering or secret redaction needed
      logger.debug(`Proxy: streaming binary response (${contentType})`);
      const upstreamLength = res.headers.get("content-length");
      after(async () => {
        try {
          await writeAuditLog({
            action: "PROXY_CALL",
            projectId: project.id,
            apiKeyId: project.apiKeyId,
            apiKeyName: project.apiKeyName,
            targetUrl: fetchUrl,
            requestBytes,
            responseBytes: upstreamLength ? parseInt(upstreamLength) : null,
            secretKeys: accessedKeys,
          });
        } catch (error) {
          logger.error(`Failed to write proxy audit log: ${String(error)}`);
        }
      });
      return new NextResponse(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: stripEncodingHeaders(res.headers),
      });
    }

    // Text/JSON/XML — buffer so we can redact any injected secrets before returning
    const contentLength = res.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength) > 10_000_000) {
      logger.error(`Response too large: ${contentLength} bytes from ${fetchUrl}`);
      return NextResponse.json({ error: "Response too large" }, { status: 413 });
    }

    const startBuffer = Date.now();
    const responseBodyBuffer = await res.arrayBuffer();
    logger.debug(
      `Proxy: arrayBuffer read in ${Date.now() - startBuffer}ms, size: ${responseBodyBuffer.byteLength} bytes`,
    );

    // Guard against chunked responses that omit Content-Length
    if (responseBodyBuffer.byteLength > 10_000_000) {
      logger.error(`Response too large: ${responseBodyBuffer.byteLength} bytes from ${fetchUrl}`);
      return NextResponse.json({ error: "Response too large" }, { status: 413 });
    }

    const startSanitize = Date.now();
    const bodyToReturn = sanitizeResponseBody(
      responseBodyBuffer,
      injectedData.secretValues,
      contentType,
    );
    logger.debug(`Proxy: sanitized in ${Date.now() - startSanitize}ms`);

    logger.debug(`Proxy: about to return response`);
    after(async () => {
      try {
        await writeAuditLog({
          action: "PROXY_CALL",
          projectId: project.id,
          apiKeyId: project.apiKeyId,
          apiKeyName: project.apiKeyName,
          targetUrl: fetchUrl,
          requestBytes,
          responseBytes: responseBodyBuffer.byteLength,
          secretKeys: accessedKeys,
        });
      } catch (error) {
        logger.error(`Failed to write proxy audit log: ${String(error)}`);
      }
    });
    return new NextResponse(bodyToReturn, {
      status: res.status,
      statusText: res.statusText,
      headers: fixHeaders(res.headers, bodyToReturn),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Proxy exception: ${message}`);
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  } finally {
    logger.debug(`Proxy: function complete`);
  }
}

function resolveEnvVar(
  key: string,
  envVars: { key: string; value: string }[],
): Promise<string> {
  const match = envVars.find((v) => v.key === key);
  if (!match) {
    throw new Error(`no env var "${key}" for this project`);
  }
  return Promise.resolve(match.value);
}

// For streamed binary responses — strip encoding/length headers and let the
// runtime set them appropriately for the piped stream.
function stripEncodingHeaders(responseHeaders: Headers): Headers {
  const headers = new Headers();
  responseHeaders.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === "content-encoding" ||
      lowerKey === "transfer-encoding" ||
      lowerKey === "content-length"
    ) {
      return;
    }
    headers.set(key, value);
  });
  return headers;
}

// For buffered text responses — recalculate Content-Length after redaction.
function fixHeaders(responseHeaders: Headers, body: string | ArrayBuffer): Headers {
  const headers = stripEncodingHeaders(responseHeaders);
  const bodySize =
    typeof body === "string"
      ? new TextEncoder().encode(body).length
      : body.byteLength;
  headers.set("Content-Length", bodySize.toString());
  return headers;
}
