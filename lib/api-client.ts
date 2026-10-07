export const apiMode = process.env.NEXT_PUBLIC_API_MODE === "true";

// Capture the auth revision at request start, so an old 401 cannot clear a new login.
const unauthorizedListeners = new Set<() => (() => void)>();
export function onUnauthorized(capture: () => (() => void)) {
  unauthorizedListeners.add(capture);
  return () => { unauthorizedListeners.delete(capture); };
}

async function send(path: string, options: RequestInit = {}) {
  const unauthorized = Array.from(unauthorizedListeners, capture => capture());
  const headers = new Headers(options.headers);
  headers.set("X-BaoTin-Client", "web");
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/backend${path}`, { ...options, headers, credentials: "include", cache: "no-store" });
  if (response.status === 401 && !path.startsWith("/auth/")) unauthorized.forEach(invalidate => invalidate());
  return response;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await send(path, options);
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(Array.isArray(value?.message) ? value.message.join(". ") : value?.message || "Không thể kết nối máy chủ. Vui lòng thử lại.");
  if (value === null) throw new Error(`Phản hồi API không hợp lệ. Vui lòng kiểm tra backend và thử lại. (${path.split("?")[0]}, HTTP ${response.status})`);
  return value as T;
}

export async function apiPdf(path: string): Promise<Blob> {
  const response = await send(path);
  if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
    const value = await response.json().catch(() => null);
    throw new Error(value?.message || "Không thể tải tài liệu.");
  }
  const blob = await response.blob();
  if (await blob.slice(0, 5).text() !== "%PDF-") throw new Error("Tài liệu PDF không hợp lệ.");
  return blob;
}
