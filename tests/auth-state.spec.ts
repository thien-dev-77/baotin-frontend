import { expect, test } from "@playwright/test";
import { makeStore } from "../lib/store";
import { authCheckFailed, authCheckStarted, authReceived } from "../lib/store/auth-slice";
import { api, onUnauthorized } from "../lib/api-client";
import type { SessionUser } from "../lib/types";

const user: SessionUser = { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null };
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("Redux stores are isolated and auth contains no token", () => {
  const first = makeStore(), second = makeStore();
  first.dispatch(authReceived(user));
  expect(first.getState().auth.user).toEqual(user);
  expect(second.getState().auth.user).toBeNull();
  expect(first.getState().auth).not.toHaveProperty("token");
});

test("A background auth check and transient error preserve the last verified user", () => {
  const store = makeStore();
  store.dispatch(authReceived(user));
  store.dispatch(authCheckStarted());
  expect(store.getState().auth).toMatchObject({ user, ready: true, checking: true });
  store.dispatch(authCheckFailed("Server unavailable"));
  expect(store.getState().auth).toMatchObject({ user, ready: true, checking: false, error: "Server unavailable" });
  store.dispatch(authReceived(null));
  expect(store.getState().auth).toMatchObject({ user: null, ready: true, checking: false, error: "" });
});

test("Protected API 401 clears auth, but wrong credentials do not", async () => {
  let expired = 0;
  const unsubscribe = onUnauthorized(() => () => { expired++; });
  globalThis.fetch = async () => Response.json({ message: "Unauthorized" }, { status: 401 });
  try {
    for (const path of ["/auth/login", "/auth/change-password", "/auth/reset-password"]) await expect(api(path)).rejects.toThrow("Unauthorized");
    expect(expired).toBe(0);
    await expect(api("/admin/state")).rejects.toThrow("Unauthorized");
    expect(expired).toBe(1);
    globalThis.fetch = async () => Response.json({ message: "Forbidden" }, { status: 403 });
    await expect(api("/admin/state")).rejects.toThrow("Forbidden");
    expect(expired).toBe(1);
  } finally { unsubscribe(); }
});

test("A stale 401 cannot clear a newer verified login", async () => {
  const store = makeStore();
  store.dispatch(authReceived(user));
  const unsubscribe = onUnauthorized(() => {
    const revision = store.getState().auth.revision;
    return () => { if (revision === store.getState().auth.revision) store.dispatch(authReceived(null)); };
  });
  let release!: () => void;
  globalThis.fetch = () => new Promise<Response>(resolve => { release = () => resolve(Response.json({ message: "Expired" }, { status: 401 })); });
  try {
    const request = api("/account");
    store.dispatch(authReceived({ ...user, id: "new-user" }));
    release();
    await expect(request).rejects.toThrow("Expired");
    expect(store.getState().auth.user?.id).toBe("new-user");
  } finally { unsubscribe(); }
});
