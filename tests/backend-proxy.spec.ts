import { expect, test } from "@playwright/test";
import { proxyBackend } from "../lib/backend-proxy";

const originalFetch = globalThis.fetch;
const originalBackend = process.env.BACKEND_URL;
test.beforeEach(() => { process.env.BACKEND_URL = "http://127.0.0.1:4002"; });
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBackend === undefined) delete process.env.BACKEND_URL;
  else process.env.BACKEND_URL = originalBackend;
});
const request = (path: string, options?: RequestInit) => new Request(`http://localhost:3041${path}`, options);

test("Proxy preserves JSON, authentication cookies and uncached API responses", async () => {
  globalThis.fetch = async (target, options) => {
    expect(String(target)).toBe("http://127.0.0.1:4002/api/auth/session");
    const headers = new Headers(options?.headers);
    expect(headers.get("cookie")).toBe("baotin_session=qa-token");
    expect(headers.get("x-baotin-client")).toBe("web");
    expect(headers.get("accept-encoding")).toBe("identity");
    const response = Response.json({ user: null });
    response.headers.append("set-cookie", "baotin_session=qa-token; Path=/; HttpOnly; SameSite=Lax");
    response.headers.append("set-cookie", "baotin_guest=qa-guest; Path=/; HttpOnly; SameSite=Lax");
    return response;
  };
  const response = await proxyBackend(request("/api/backend/auth/session", { headers: { cookie: "baotin_session=qa-token", "x-baotin-client": "web" } }), ["auth", "session"], "api");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ user: null });
  expect(response.headers.getSetCookie()).toHaveLength(2);
  expect(response.headers.get("cache-control")).toContain("private, no-store");
});

test("Proxy forwards POST origin, CSRF and JSON bodies without changing them", async () => {
  const body = JSON.stringify({ items: [], delivery: "store" });
  globalThis.fetch = async (_target, options) => {
    expect(options?.method).toBe("POST");
    const headers = new Headers(options?.headers);
    expect(headers.get("origin")).toBe("http://localhost:3041");
    expect(headers.get("x-baotin-client")).toBe("web");
    expect(headers.get("idempotency-key")).toBe("qa-key");
    expect(new TextDecoder().decode(options?.body as ArrayBuffer)).toBe(body);
    return Response.json({ id: "qa-order" }, { status: 201 });
  };
  const response = await proxyBackend(request("/api/backend/orders", { method: "POST", headers: { origin: "http://localhost:3041", "x-baotin-client": "web", "content-type": "application/json", "idempotency-key": "qa-key" }, body }), ["orders"], "api");
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ id: "qa-order" });
});

test("Multipart upload bodies retain their boundary and file bytes", async () => {
  const form = new FormData();
  form.append("image", new Blob([new Uint8Array([255, 216, 255])], { type: "image/jpeg" }), "qa.jpg");
  const incoming = request("/api/backend/media/products/qa/image", { method: "POST", body: form });
  const expected = await incoming.clone().arrayBuffer();
  globalThis.fetch = async (_target, options) => {
    expect(new Headers(options?.headers).get("content-type")).toBe(incoming.headers.get("content-type"));
    expect(options?.body).toEqual(expected);
    return Response.json({ url: "/media/uploads/qa.webp" });
  };
  expect((await proxyBackend(incoming, ["media", "products", "qa", "image"], "api")).status).toBe(200);
});

test("Media proxy retains binary bytes but removes stale compression/length headers", async () => {
  const bytes = new Uint8Array([255, 216, 255, 224, 0, 255, 217]);
  globalThis.fetch = async (target) => {
    expect(String(target)).toBe("http://127.0.0.1:4002/media/images/locks/912-21-048.jpg");
    return new Response(bytes, { headers: { "content-type": "image/jpeg", "content-length": "1", "content-encoding": "gzip", "cache-control": "public, max-age=86400", vary: "Accept" } });
  };
  const response = await proxyBackend(request("/images/locks/912-21-048.jpg"), ["images", "locks", "912-21-048.jpg"], "media");
  expect(response.headers.get("content-type")).toBe("image/jpeg");
  expect(response.headers.has("content-encoding")).toBe(false);
  expect(response.headers.has("content-length")).toBe(false);
  expect(response.headers.get("vary")).toBe("Accept");
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
});

test("Empty, null and HTML API responses become actionable 502 errors", async () => {
  for (const body of ["", "null", "<html>Bad gateway</html>"]) {
    globalThis.fetch = async () => new Response(body, { status: 200 });
    const response = await proxyBackend(request("/api/backend/auth/session"), ["auth", "session"], "api");
    expect(response.status).toBe(502);
    expect((await response.json()).message).toContain("Backend trả phản hồi không hợp lệ");
  }
});

test("Proxy preserves valid API error statuses and does not expose connection details", async () => {
  globalThis.fetch = async () => Response.json({ message: "Session expired" }, { status: 401 });
  let response = await proxyBackend(request("/api/backend/account"), ["account"], "api");
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ message: "Session expired" });
  globalThis.fetch = async () => { throw new Error("private connection credentials"); };
  response = await proxyBackend(request("/api/backend/account"), ["account"], "api");
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain("private connection credentials");
});

test("Media HEAD stays bodyless; nested paths/query remain on the configured backend", async () => {
  globalThis.fetch = async (target, options) => {
    expect(String(target)).toBe("http://127.0.0.1:4002/media/uploads/qa.webp?v=2");
    expect(options?.method).toBe("HEAD");
    return new Response(null, { headers: { "content-type": "image/webp" } });
  };
  const response = await proxyBackend(request("/media/uploads/qa.webp?v=2", { method: "HEAD" }), ["uploads", "qa.webp"], "media");
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("");
});

test("Proxy rejects traversal and path injection before making upstream requests", async () => {
  globalThis.fetch = async () => { throw new Error("Fetch must not be reached"); };
  for (const path of [[], ["..", "certs"], ["http://outside.test"], ["uploads\\qa.webp"], ["bad\0path"]]) {
    expect((await proxyBackend(request("/media/bad"), path, "media")).status).toBe(400);
  }
});
