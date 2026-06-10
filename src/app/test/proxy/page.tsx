"use client";

import { useState } from "react";

export default function TestProxyPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fetchUrl, setFetchUrl] = useState("/api/echo");
  const [requestInit, setRequestInit] = useState(
    JSON.stringify(
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foo: "TEST_ENV_VAR" }),
      },
      null,
      2,
    ),
  );
  const [secretKeys, setSecretKeys] = useState(
    JSON.stringify(["TEST_ENV_VAR"]),
  );
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    try {
      const resolvedFetchUrl = fetchUrl.startsWith("/")
        ? `${window.location.origin}${fetchUrl}`
        : fetchUrl;
      const body: Record<string, unknown> = { fetchUrl: resolvedFetchUrl };
      if (requestInit.trim()) {
        body.requestInit = JSON.parse(requestInit);
      }
      if (secretKeys.trim()) {
        body.secretKeys = JSON.parse(secretKeys);
      }

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${username}:${password}`,
        },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get("Content-Type") || "";
      let text: string;
      if (contentType.includes("application/json")) {
        const json = await res.json();
        text = JSON.stringify(json, null, 2);
      } else {
        text = await res.text();
      }

      setResponse(`Status: ${res.status} ${res.statusText}\n\n${text}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setResponse(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-theme="dark" className="min-h-screen bg-base-200 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Proxy Test</h1>

        <div className="card bg-base-100 shadow-xl">
          <form onSubmit={handleSubmit} className="card-body gap-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Username</span>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </label>
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">Password</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </label>
            </div>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Fetch URL</span>
              </div>
              <input
                type="text"
                value={fetchUrl}
                onChange={(e) => setFetchUrl(e.target.value)}
                className="input input-bordered w-full"
                placeholder="https://example.com/api/endpoint"
                required
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Request Init (JSON)</span>
              </div>
              <textarea
                value={requestInit}
                onChange={(e) => setRequestInit(e.target.value)}
                rows={8}
                className="textarea textarea-bordered w-full font-mono text-sm leading-relaxed"
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Secret Keys (JSON array)</span>
              </div>
              <input
                type="text"
                value={secretKeys}
                onChange={(e) => setSecretKeys(e.target.value)}
                className="input input-bordered w-full font-mono text-sm"
              />
            </label>

            <div className="card-actions mt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading && <span className="loading loading-spinner loading-sm" />}
                {loading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </form>
        </div>

        {response && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              <div className="bg-neutral rounded-xl p-5 overflow-x-auto">
                <pre className="text-sm text-neutral-content font-mono whitespace-pre-wrap">{response}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
