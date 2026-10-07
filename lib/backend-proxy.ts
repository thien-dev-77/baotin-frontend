const requestHeaders = ["accept", "content-type", "cookie", "origin", "x-baotin-client", "idempotency-key", "if-none-match", "if-modified-since", "range", "if-range"];
const responseHeaders = ["content-type", "etag", "last-modified", "content-disposition", "content-range", "accept-ranges", "retry-after", "vary"];

export type BackendRouteContext = { params: Promise<{ path: string[] }> };

export async function proxyBackend(request: Request, path: string[], kind: "api" | "media"): Promise<Response> {
  if (!path.length || path.some((part) => !part || part === "." || part === ".." || /[\\/\0]/.test(part))) {
    return Response.json({ message: "Đường dẫn không hợp lệ." }, { status: 400 });
  }
  try {
    const target = new URL(process.env.BACKEND_URL || "http://127.0.0.1:4000");
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) throw new Error("Invalid backend URL");
    target.pathname = `${target.pathname.replace(/\/$/, "")}/${kind}/${path.map(encodeURIComponent).join("/")}`;
    target.search = new URL(request.url).search;
    const headers = new Headers();
    for (const key of requestHeaders) {
      const value = request.headers.get(key);
      if (value !== null) headers.set(key, value);
    }
    // Fetch decodes upstream bodies; do not forward compressed content-length/encoding.
    headers.set("accept-encoding", "identity");
    const upstream = await fetch(target, {
      method: request.method, headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(30000)
    });
    const outgoing = new Headers();
    for (const key of responseHeaders) {
      const value = upstream.headers.get(key);
      if (value !== null) outgoing.set(key, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) outgoing.append("set-cookie", cookie);
    outgoing.set("cache-control", kind === "api" || !upstream.ok ? "private, no-store, max-age=0" : upstream.headers.get("cache-control") || "public, max-age=86400");
    outgoing.set("x-content-type-options", "nosniff");
    const documentRoute = request.method === "GET" && ((path.length === 3 && path[0] === "orders" && path[2] === "document") || (path.length === 4 && path[0] === "admin" && path[1] === "orders" && path[3] === "document"));
    if (kind === "api" && documentRoute && upstream.ok && upstream.headers.get("content-type")?.split(";")[0] === "application/pdf") {
      const bytes = await upstream.arrayBuffer();
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return Response.json({ message: "Tài liệu PDF không hợp lệ." }, { status: 502 });
      return new Response(bytes, { status: upstream.status, headers: outgoing });
    }
    if (kind === "api" && request.method !== "HEAD" && upstream.status !== 204 && upstream.status !== 304) {
      const body = await upstream.text();
      try { if (JSON.parse(body) === null) throw new Error("Null API response"); }
      catch { return Response.json({ message: "Backend trả phản hồi không hợp lệ. Vui lòng thử lại." }, { status: 502, headers: { "cache-control": "private, no-store" } }); }
      return new Response(body, { status: upstream.status, headers: outgoing });
    }
    return new Response(upstream.body, { status: upstream.status, headers: outgoing });
  } catch {
    return Response.json({ message: "Không thể kết nối backend. Vui lòng thử lại." }, { status: 502, headers: { "cache-control": "private, no-store" } });
  }
}
