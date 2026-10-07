export const apiMode = process.env.NEXT_PUBLIC_API_MODE === "true";

// Capture the auth revision at request start, so an old 401 cannot clear a new login.
const unauthorizedListeners = new Set<() => (() => void)>();
export function onUnauthorized(capture: () => (() => void)) {
  unauthorizedListeners.add(capture);
  return () => { unauthorizedListeners.delete(capture); };
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const unauthorized = Array.from(unauthorizedListeners, capture => capture());
  const headers = new Headers(options.headers);
  headers.set("X-BaoTin-Client", "web");
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/backend${path}`, { ...options, headers, credentials: "include", cache: "no-store" });
  const value = await response.json().catch(() => null);
  if (response.status === 401 && !path.startsWith("/auth/")) unauthorized.forEach(invalidate => invalidate());
  if (!response.ok) throw new Error(Array.isArray(value?.message) ? value.message.join(". ") : value?.message || "Không thể kết nối máy chủ. Vui lòng thử lại.");
  if (value === null) throw new Error(`Phản hồi API không hợp lệ. Vui lòng kiểm tra backend và thử lại. (${path.split("?")[0]}, HTTP ${response.status})`);
  return value as T;
}
