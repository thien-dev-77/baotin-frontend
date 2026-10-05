export const apiMode = process.env.NEXT_PUBLIC_API_MODE === "true";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-BaoTin-Client", "web");
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/backend${path}`, { ...options, headers, credentials: "include", cache: "no-store" });
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(Array.isArray(value?.message) ? value.message.join(". ") : value?.message || "Không thể kết nối máy chủ. Vui lòng thử lại.");
  return value as T;
}
