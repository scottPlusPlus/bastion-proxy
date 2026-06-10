import { describe, test, expect } from "vitest";
import {
  isValidRequestInit,
  injectRequestData,
  sanitizeResponseBody,
} from "./utils";

describe("isValidRequestInit", () => {
  test("accepts a minimal valid RequestInit object", () => {
    expect(isValidRequestInit({ method: "GET" })).toBe(true);
  });

  test("accepts headers and body with correct types", () => {
    expect(
      isValidRequestInit({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foo: "bar" }),
      }),
    ).toBe(true);
  });

  test("rejects unknown fields", () => {
    expect(isValidRequestInit({ foo: "bar" })).toBe(false);
  });

  test("rejects incorrect types for known fields", () => {
    expect(isValidRequestInit({ method: 123 })).toBe(false);
    expect(isValidRequestInit({ keepalive: "yes" })).toBe(false);
    expect(isValidRequestInit({ window: "not-null" })).toBe(false);
  });

  test("accepts null for window", () => {
    expect(isValidRequestInit({ window: null })).toBe(true);
  });

  test("accepts signal as object", () => {
    expect(isValidRequestInit({ signal: new AbortController().signal })).toBe(
      true,
    );
  });

  test("rejects if input is not an object", () => {
    expect(isValidRequestInit(null)).toBe(false);
    expect(isValidRequestInit(undefined)).toBe(false);
    expect(isValidRequestInit("string")).toBe(false);
    expect(isValidRequestInit(123)).toBe(false);
  });
});

describe("replaceRequestData", () => {
  async function LOOKUP_FUNC(key: string): Promise<string> {
    return `REPLACED_${key.toUpperCase()}`;
  }
  const SOME_URL = "http://localhost:3000";

  test("replaces placeholders in headers and body", async () => {
    const input: RequestInit = {
      method: "POST",
      headers: {
        Authorization: "Bearer MY_KEY",
      },
      body: JSON.stringify({ userId: "USER_ID" }),
    };

    const output = await injectRequestData(
      SOME_URL,
      input,
      ["MY_KEY", "USER_ID"],
      LOOKUP_FUNC,
    );

    expect(output.requestInit).toEqual({
      method: "POST",
      headers: {
        Authorization: "Bearer REPLACED_MY_KEY",
      },
      body: JSON.stringify({ userId: "REPLACED_USER_ID" }),
    });
  });

  test("leaves fields without keys unchanged", async () => {
    const input: RequestInit = {
      method: "GET",
      headers: {
        "X-Custom-Header": "static-value",
      },
    };

    const output = await injectRequestData(
      SOME_URL,
      input,
      ["MY_KEY", "USER_ID"],
      LOOKUP_FUNC,
    );

    expect(output.requestInit).toEqual({
      method: "GET",
      headers: {
        "X-Custom-Header": "static-value",
      },
    });
  });

  test("replaces multiple occurrences of the same placeholder", async () => {
    const input: RequestInit = {
      headers: {
        Cookie: "id=FOO; token=FOO",
      },
    };

    const output = await injectRequestData(
      SOME_URL,
      input,
      ["FOO"],
      LOOKUP_FUNC,
    );

    expect(output.requestInit).toEqual({
      headers: {
        Cookie: "id=REPLACED_FOO; token=REPLACED_FOO",
      },
    });
  });

  test("works with nested strings in JSON bodies", async () => {
    const input: RequestInit = {
      body: JSON.stringify({
        profile: {
          name: "NAME",
          email: "EMAIL",
        },
      }),
    };

    const output = injectRequestData(
      SOME_URL,
      input,
      ["NAME", "EMAIL"],
      LOOKUP_FUNC,
    );

    expect((await output).requestInit).toEqual({
      body: JSON.stringify({
        profile: {
          name: "REPLACED_NAME",
          email: "REPLACED_EMAIL",
        },
      }),
    });
  });
});

describe("sanitizeResponseBody", () => {
  test("should redact secrets from a text response", () => {
    const originalText = "Token: REPLACED_SECRET, ID: REPLACED_USERID";
    const buffer = new TextEncoder().encode(originalText).buffer;
    const secrets = ["REPLACED_SECRET", "REPLACED_USERID"];

    const result = sanitizeResponseBody(buffer, secrets, "text/plain");

    expect(typeof result).toBe("string");
    expect(result).not.toContain("REPLACED_SECRET");
    expect(result).not.toContain("REPLACED_USERID");
    expect(result).toContain("[REDACTED]");
  });

  test("should return original buffer if content type is not text", () => {
    const buffer = new TextEncoder().encode("This is binary content").buffer;
    const secrets = ["some_secret"];

    const result = sanitizeResponseBody(
      buffer,
      secrets,
      "application/octet-stream",
    );

    expect(result).toBe(buffer);
  });

  test("should handle empty secret list without modifying content", () => {
    const originalText = "No secrets here";
    const buffer = new TextEncoder().encode(originalText).buffer;
    const result = sanitizeResponseBody(buffer, [], "text/plain");

    expect(result).toBe(originalText);
  });

  test("should handle invalid UTF-8 decoding gracefully", () => {
    // Create invalid UTF-8 buffer
    const invalidBuffer = new Uint8Array([0xff, 0xfe, 0xfd]).buffer;
    const result = sanitizeResponseBody(
      invalidBuffer,
      ["anything"],
      "text/plain",
    );
    expect(result).toEqual(invalidBuffer);
  });
});
