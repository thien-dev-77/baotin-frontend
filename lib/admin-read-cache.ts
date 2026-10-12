const READ_TTL_MS = 60_000;
type Entry = { data?: unknown; loadedAt: number; version: number; pending?: Promise<unknown> };

// One instance per mounted auth scope. Private responses never enter storage or
// a shared HTTP cache; mounted screens alone subscribe to refreshes.
export class AdminReadCache {
  constructor(readonly scope = "") {}
  private entries = new Map<string, Entry>();
  private readers = new Map<string, Set<() => Promise<void>>>();
  peek<T>(path: string): T | undefined { return this.entries.get(path)?.data as T | undefined; }
  async load<T>(path: string, fetcher: () => Promise<T>, force = false): Promise<T> {
    const entry = this.entries.get(path) || { loadedAt: 0, version: 0 };
    this.entries.set(path, entry);
    if (entry.pending) return entry.pending as Promise<T>;
    if (!force && entry.data !== undefined && Date.now() - entry.loadedAt < READ_TTL_MS) return entry.data as T;
    const version = entry.version;
    const pending = fetcher().then(data => {
      if (entry.version === version) { entry.data = data; entry.loadedAt = Date.now(); }
      return data;
    }).finally(() => { if (entry.pending === pending) entry.pending = undefined; });
    entry.pending = pending;
    return pending;
  }
  watch(path: string, reload: () => Promise<void>) {
    const readers = this.readers.get(path) || new Set();
    readers.add(reload); this.readers.set(path, readers);
    return () => { readers.delete(reload); if (!readers.size) this.readers.delete(path); };
  }
  invalidate(matches: (path: string) => boolean = () => true) {
    for (const [path, entry] of Array.from(this.entries)) if (matches(path)) { entry.loadedAt = 0; entry.version++; entry.pending = undefined; }
  }
  async refresh(matches: (path: string) => boolean = () => true) {
    this.invalidate(matches);
    await Promise.all(Array.from(this.readers).filter(([path]) => matches(path)).flatMap(([, readers]) => Array.from(readers).map(reload => reload())));
  }
}
