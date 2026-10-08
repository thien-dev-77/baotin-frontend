export const publicCache = {
  catalog: { tag: "baotin-public-catalog", seconds: 15 },
  content: { tag: "baotin-public-content", seconds: 60 },
} as const;

export function publicCacheTagsForMutation(method: string, path: readonly string[], status: number): string[] {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method) || status < 200 || status >= 300) return [];
  if (path[0] === "admin" && path[1] === "content") return [publicCache.content.tag];
  if (path[0] === "admin" && ["commands", "products", "categories", "ledger", "integrations"].includes(path[1])) return [publicCache.catalog.tag];
  if (path[0] === "orders" && path[1] !== "quote") return [publicCache.catalog.tag];
  return [];
}
