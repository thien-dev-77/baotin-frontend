import type { ApiAdminState } from "./api-types";
import type { Branch } from "./types";

export const adminResources = ["products", "categories", "customers", "orders", "approvals", "receipts"] as const;
export type AdminResource = typeof adminResources[number];
const cacheTtl = 60_000;
const fields: Record<AdminResource, readonly (keyof ApiAdminState)[]> = {
  products: ["products", "stockByBranch"], categories: ["categories"], customers: ["customers"],
  orders: ["orders", "warehouse", "paymentDueDates"], approvals: ["approvals"], receipts: ["receipts"],
};
export const emptyAdminState = (): ApiAdminState => ({ products: [], categories: [], customers: [], orders: [], approvals: [], warehouse: {}, receipts: [], paymentDueDates: {}, today: "" });

export function resourcesForAdminPage(path: string): readonly AdminResource[] {
  if (path.startsWith("/admin/products")) return ["products", "categories"];
  if (path.startsWith("/admin/orders/")) return ["orders", "customers", "approvals", "products", "categories"];
  if (path === "/admin/orders" || path === "/admin/warehouse") return ["orders"];
  if (path.startsWith("/admin/approvals")) return ["orders", "customers", "approvals", "products"];
  if (["/admin/customers", "/admin/credit"].includes(path)) return ["customers", "orders"];
  if (path === "/admin/accounting") return ["orders", "receipts"];
  if (path === "/admin/pricing") return ["products", "customers"];
  if (path === "/admin/integrations") return ["products", "customers", "orders"];
  if (path === "/admin/content") return ["categories"];
  if (path === "/admin") return ["orders", "customers", "approvals"];
  return [];
}

export function resourcesChangedBy(action: string): readonly AdminResource[] {
  if (action === "customer-status") return ["customers"];
  if (action === "publish-product") return ["products"];
  if (["save-order", "pick-item", "report-shortage", "resolve-shortage"].includes(action)) return ["orders"];
  if (action === "due-date") return ["orders", "customers"];
  if (["advance-order", "cancel-order"].includes(action)) return ["orders", "products", "customers"];
  if (["create-approval", "decide-approval"].includes(action)) return ["orders", "approvals", "customers"];
  if (["create-receipt", "reconcile-receipt", "void-receipt"].includes(action)) return ["receipts", "customers"];
  return ["orders", "products", "customers", "approvals", "receipts"];
}

type Entry = { data: Partial<ApiAdminState>; loadedAt: number };
type FetchResources = (branch: Branch, resources: readonly AdminResource[]) => Promise<Partial<ApiAdminState>>;

// Owned by one mounted access scope, never persisted or shared between users.
export class AdminResourceCache {
  constructor(readonly scopeKey: string) {}
  private entries = new Map<string, Entry>();
  private reads = new Map<string, Promise<void>>();
  private versions = new Map<string, number>();
  private key(branch: Branch, resource: AdminResource) { return `${branch}:${resource}`; }
  loaded(branch: Branch) { return adminResources.filter(resource => this.entries.has(this.key(branch, resource))); }
  pending(branch: Branch) { return adminResources.some(resource => this.reads.has(this.key(branch, resource))); }
  state(branch: Branch): ApiAdminState {
    return Object.assign(emptyAdminState(), ...adminResources.map(resource => this.entries.get(this.key(branch, resource))?.data));
  }
  invalidate(branch: Branch, resources: readonly AdminResource[]) {
    for (const resource of resources) {
      const key = this.key(branch, resource);
      const entry = this.entries.get(key);
      if (entry) entry.loadedAt = 0;
      this.versions.set(key, (this.versions.get(key) || 0) + 1);
      this.reads.delete(key);
    }
  }
  async load(branch: Branch, resources: readonly AdminResource[], fetcher: FetchResources, changed: () => void) {
    const needed = Array.from(new Set(resources)).filter(resource => {
      const entry = this.entries.get(this.key(branch, resource));
      return !entry || Date.now() - entry.loadedAt >= cacheTtl;
    });
    const waiting = new Set(needed.flatMap(resource => this.reads.get(this.key(branch, resource)) || []));
    const missing = needed.filter(resource => !this.reads.has(this.key(branch, resource)));
    if (missing.length) {
      const versions = missing.map(resource => this.versions.get(this.key(branch, resource)) || 0);
      const read = Promise.resolve().then(() => fetcher(branch, missing)).then(data => {
        if (!data || typeof data !== "object" || missing.some(resource => !Array.isArray(data[resource]))) throw new Error("Dữ liệu quản trị không hợp lệ. Vui lòng thử lại.");
        missing.forEach((resource, index) => {
          const key = this.key(branch, resource);
          if ((this.versions.get(key) || 0) !== versions[index]) return;
          const projection: Partial<ApiAdminState> = { today: data.today };
          for (const field of fields[resource]) Object.assign(projection, { [field]: data[field] });
          this.entries.set(key, { data: projection, loadedAt: Date.now() });
        });
      }).catch(error => {
        if (missing.some((resource, index) => (this.versions.get(this.key(branch, resource)) || 0) === versions[index])) throw error;
      }).finally(() => {
        for (const resource of missing) {
          const key = this.key(branch, resource);
          if (this.reads.get(key) === read) this.reads.delete(key);
        }
        changed();
      });
      for (const resource of missing) this.reads.set(this.key(branch, resource), read);
      waiting.add(read);
      changed();
    }
    await Promise.all(waiting);
  }
}
