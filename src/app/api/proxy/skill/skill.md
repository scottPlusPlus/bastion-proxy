# Bastion Proxy

Bastion is a secure server-side proxy that injects secrets into outgoing HTTP requests. Client apps store no credentials — all secrets live in Bastion's project env vars and are injected at request time.

## Authentication

Every request to Bastion requires `x-api-key: {BASTION_KEY}` header. The key starts with `bp_`.

## Endpoints

---

### POST /api/proxy

General-purpose proxy. Supports two modes: `fetchUrl` (make a request) and `getUrl` (resolve a URL).

**Common fields:**
- `secretKeys` — array of env var names stored in Bastion. Each name is replaced as a literal string wherever it appears in the URL, request body, or headers.

#### fetchUrl mode

Makes an HTTP request on behalf of the caller and returns the response.

```json
{
  "fetchUrl": "https://api.example.com/endpoint",
  "requestInit": {
    "method": "POST",
    "headers": { "Authorization": "Bearer MY_API_KEY", "Content-Type": "application/json" },
    "body": "{\"client_id\":\"MY_CLIENT_ID\",\"secret\":\"MY_SECRET\"}"
  },
  "secretKeys": ["MY_API_KEY", "MY_CLIENT_ID", "MY_SECRET"]
}
```

Bastion resolves each name in `secretKeys` from the project env vars, then replaces every occurrence of that name as a literal string in `fetchUrl`, `requestInit.headers`, and `requestInit.body` before forwarding the request. The response is returned as-is and secrets are redacted from text/JSON responses.

#### getUrl mode

Injects secrets into a URL string and returns it — no HTTP request is made. Use this for OAuth authorize URLs or any URL the browser will open directly.

**Only non-secret env vars may be used in `getUrl`** — the resolved URL is returned directly to the caller, so any injected value is visible to them. Passing an env var marked as secret will return a 400 error.

```json
{
  "getUrl": "https://provider.com/oauth/authorize?client_id=PROVIDER_CLIENT_ID&redirect_uri=PROVIDER_REDIRECT_URI&state=xyz",
  "secretKeys": ["PROVIDER_CLIENT_ID", "PROVIDER_REDIRECT_URI"]
}
```

Response:
```json
{ "url": "https://provider.com/oauth/authorize?client_id=real_id&redirect_uri=https://app.com/callback&state=xyz" }
```

---

## Secret injection rules

- Secrets are resolved from the Bastion project's env vars by exact key name match.
- Injection is a literal string replacement — the key name must appear verbatim in the URL, header value, or body.
- Text/JSON/XML responses are buffered and secrets are redacted before returning to the caller.
- Binary responses (images, video, etc.) are streamed directly without buffering.
- `getUrl` only accepts non-secret env vars — secret values must never be returned to the caller.
