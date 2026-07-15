import { logger } from "@/lib/logger";

export function isValidRequestInit(data: unknown): data is RequestInit {
  if (typeof data !== "object" || data === null) return false;

  const allowedKeys = new Set([
    "method",
    "headers",
    "body",
    "mode",
    "credentials",
    "cache",
    "redirect",
    "referrer",
    "referrerPolicy",
    "integrity",
    "keepalive",
    "signal",
    "window",
  ]);

  // Check for extra keys
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) return false;
  }

  // Type checks for known keys
  if ("method" in data && typeof data.method !== "string") return false;
  if ("headers" in data && typeof data.headers !== "object") return false;
  if (
    "body" in data &&
    typeof data.body !== "string" &&
    !(
      data.body instanceof Blob ||
      data.body instanceof FormData ||
      data.body instanceof URLSearchParams
    )
  )
    return false;
  if ("mode" in data && typeof data.mode !== "string") return false;
  if ("credentials" in data && typeof data.credentials !== "string")
    return false;
  if ("cache" in data && typeof data.cache !== "string") return false;
  if ("redirect" in data && typeof data.redirect !== "string") return false;
  if ("referrer" in data && typeof data.referrer !== "string") return false;
  if ("referrerPolicy" in data && typeof data.referrerPolicy !== "string")
    return false;
  if ("integrity" in data && typeof data.integrity !== "string") return false;
  if ("keepalive" in data && typeof data.keepalive !== "boolean") return false;
  if ("signal" in data && typeof data.signal !== "object") return false;
  if ("window" in data && data.window !== null) return false; // must be null per spec

  return true;
}

export type InjectedRequestData = {
  url: string;
  requestInit: RequestInit | undefined;
  secretValues: Array<string>;
};

export async function injectRequestData(
  url: string,
  requestInit: RequestInit | undefined,
  secretKeys: Array<string>,
  lookup: (name: string) => Promise<string>,
): Promise<InjectedRequestData> {
  // Convert fetchData to string
  const secretMap = new Map<string, string>();
  for (const key of secretKeys) {
    const val = await lookup(key);
    secretMap.set(key, val);
  }

  url = injectSecrets(url, secretMap);
  if (requestInit) {
    let reqStr = JSON.stringify(requestInit);
    reqStr = injectSecrets(reqStr, secretMap);
    requestInit = JSON.parse(reqStr);
  }

  return {
    url: url,
    requestInit: requestInit,
    secretValues: Array.from(secretMap.values()),
  };
}

export function injectSecrets(str: string, map: Map<string, string>): string {
  for (const [key, val] of map.entries()) {
    str = str.replaceAll(key, val);
  }
  return str;
}

/**
 * Attempts to redact secrets from a response body buffer if the content is text-based.
 * Returns either a redacted string or the original ArrayBuffer (if not readable).
 */
export function sanitizeResponseBody(
  responseBodyBuffer: ArrayBuffer,
  injectedSecrets: string[],
  contentType: string = "",
): string | ArrayBuffer {
  // Only attempt to decode/redact if it's text-based
  const isTextBased =
    contentType.includes("text") ||
    contentType.includes("json") ||
    contentType.includes("xml");

  if (!isTextBased) {
    return responseBodyBuffer;
  }

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true }); // Throw on bad encoding
    const decoded = decoder.decode(responseBodyBuffer);
    let redacted = decoded;
    for (const secret of injectedSecrets) {
      if (secret) {
        const escaped = secret.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        redacted = redacted.replace(new RegExp(escaped, "g"), "[REDACTED]");
      }
    }
    return redacted;
  } catch (err) {
    logger.warn("Failed to decode response body for redaction:", err);
    return responseBodyBuffer;
  }
}
