"use client";

import { CartLine, Customer, Order, Product, catalog, categoryCatalog, findProduct } from "@/lib/catalog";
import type { Category, SessionUser } from "@/lib/types";
import type { CatalogResponse, CheckoutDraft, Quote } from "@/lib/api-types";
import { api, apiMode, onUnauthorized } from "@/lib/api-client";
import { readApiSession, readCatalogResponse, retailProducts } from "@/lib/commerce-api";
import { useAppSelector, useAppStore } from "@/lib/store/hooks";
import { authCheckFailed, authCheckStarted, authEventKey, authReceived } from "@/lib/store/auth-slice";
import { CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Store = { cart: CartLine[]; favorites: string[]; orders: Order[]; coupon: string };
type Commerce = Store & {
  products: Product[]; categories: Category[]; sessionUser: SessionUser | null; apiError: string;
  refreshSession: (refreshProducts?: boolean) => Promise<void>; reloadCatalog: () => Promise<void>;
  loginWithPassword: (identity: string, password: string, remember?: boolean) => Promise<void>;
  registerWithPassword: (input: { name: string; company: string; phone: string; email: string; password: string }) => Promise<void>;
  submitOrder: (draft: CheckoutDraft, key: string) => Promise<Order>;
  quoteOrder: (input: Pick<CheckoutDraft, "items" | "delivery" | "coupon">) => Promise<Quote>;
  updateProfile: (value: Customer) => Promise<void>;
  customer: Customer | null; ready: boolean; notice: (message: string) => void;
  add: (product: Product, quantity?: number) => void; setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void; toggleFavorite: (id: string) => void;
  login: (customer: Customer, remember: boolean) => void; logout: () => Promise<void>;
  placeOrder: (order: Order) => void;
  setCoupon: (coupon: string) => void;
};
const Context = createContext<Commerce | null>(null);
const initial: Store = { cart: [], favorites: [], orders: [], coupon: "" };
const storageKey = apiMode ? "baotin-commerce-api-v1" : "baotin-commerce-v1";

function notifyAuthChange(type: "refresh" | "logout") {
  try { localStorage.setItem(authEventKey, JSON.stringify({ type, nonce: crypto.randomUUID() })); } catch {}
}

const profileKey = (identity: string) => `baotin-profile-${identity.trim().toLowerCase().replace(/\s+/g, "")}`;
export function readPreviewCustomer(identity: string): Customer | null {
  try {
    const value = JSON.parse(localStorage.getItem(profileKey(identity)) || "null");
    return value?.role === "b2b" && typeof value.id === "string" && typeof value.name === "string" && typeof value.email === "string" && typeof value.phone === "string" ? value : null;
  } catch { return null; }
}

export function CommerceProvider({ children, initialCatalog, initialCatalogError = "" }: { children: React.ReactNode; initialCatalog: CatalogResponse | null; initialCatalogError?: string }) {
  const authStore = useAppStore();
  const auth = useAppSelector(state => state.auth);
  const [store, setStore] = useState<Store>(initial);
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const sessionUser = auth.user;
  const customer = apiMode ? sessionUser?.customer || null : previewCustomer;
  const ready = storageReady && (!apiMode || auth.ready);
  const [toast, setToast] = useState("");
  const [products, setProducts] = useState<Product[]>(initialCatalog?.products || (apiMode ? [] : catalog));
  const [categories, setCategories] = useState<Category[]>(initialCatalog?.categories || categoryCatalog);
  const [catalogError, setCatalogError] = useState(initialCatalogError);
  const [accountError, setAccountError] = useState("");
  const apiError = catalogError || auth.error || accountError;
  const catalogLoaded = useRef(initialCatalog !== null);
  const sessionIdentity = useRef<string | null>(null);
  const refreshVersion = useRef(0);
  const refreshRequest = useRef<Promise<void> | null>(null);
  const hydrated = useRef(false);
  const reloadCatalog = useCallback(async () => {
    if (!apiMode) return;
    const version = refreshVersion.current;
    const result = readCatalogResponse(await api<unknown>("/catalog"));
    if (version !== refreshVersion.current) return;
    setProducts(result.products); setCategories(result.categories);
    catalogLoaded.current = true; setCatalogError("");
  }, []);
  const loadUserData = useCallback(async (user: SessionUser | null, refreshProducts: boolean, version: number) => {
    if (version !== refreshVersion.current) return;
    const identity = user?.id || null;
    if (identity !== sessionIdentity.current) {
      setStore((state) => ({ ...state, orders: [], favorites: [] }));
      setProducts(retailProducts);
      sessionIdentity.current = identity;
    }
    if (user?.customer?.status !== "active") setProducts(retailProducts);
    setAccountError("");
    const current = () => version === refreshVersion.current;
    const accountFailure = (error: unknown) => { if (current()) setAccountError(error instanceof Error ? error.message : "Không thể tải dữ liệu tài khoản."); };
    const loadCatalog = refreshProducts || !catalogLoaded.current || user?.customer?.status === "active";
    // Publish each response independently so orders/preferences cannot block products.
    await Promise.all([
      loadCatalog ? reloadCatalog().catch((error) => { if (current()) setCatalogError(error instanceof Error ? error.message : "Không thể tải sản phẩm."); }) : Promise.resolve(),
      api<Order[]>("/orders").then((orders) => {
        if (!Array.isArray(orders)) throw new Error("Phản hồi đơn hàng không hợp lệ. Vui lòng thử lại.");
        if (current()) setStore((state) => ({ ...state, orders }));
      }).catch(accountFailure),
      user ? api<{ favorites: string[] }>("/account").then((account) => {
        if (!Array.isArray(account.favorites)) throw new Error("Phản hồi tài khoản không hợp lệ. Vui lòng thử lại.");
        if (current()) setStore((state) => ({ ...state, favorites: account.favorites }));
      }).catch(accountFailure) : Promise.resolve()
    ]);
  }, [reloadCatalog]);
  const clearAuth = useCallback(() => {
    refreshVersion.current++;
    refreshRequest.current = null;
    authStore.dispatch(authReceived(null));
    sessionIdentity.current = null;
    setProducts(retailProducts);
    setStore(state => ({ ...state, orders: [], favorites: [] }));
    setAccountError("");
  }, [authStore]);
  const refreshSession = useCallback((refreshProducts = true): Promise<void> => {
    if (!apiMode) return Promise.resolve();
    if (refreshRequest.current) return refreshRequest.current;
    const version = ++refreshVersion.current;
    authStore.dispatch(authCheckStarted());
    const request: Promise<void> = (async () => {
      try {
        const { user } = readApiSession(await api<unknown>("/auth/session"));
        if (version !== refreshVersion.current) return;
        authStore.dispatch(authReceived(user));
        refreshRequest.current = null;
        await loadUserData(user, refreshProducts, version);
      } catch (error) {
        if (version === refreshVersion.current) authStore.dispatch(authCheckFailed(error instanceof Error ? error.message : "Không thể kiểm tra đăng nhập."));
      }
      finally { if (version === refreshVersion.current) refreshRequest.current = null; }
    })();
    refreshRequest.current = request;
    return request;
  }, [authStore, loadUserData]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(storageKey) || (apiMode ? localStorage.getItem("baotin-commerce-v1") : null);
      if (raw) {
        const parsed = JSON.parse(raw) as Store;
        setStore({
          coupon: parsed.coupon === "BAOTIN10" ? parsed.coupon : "",
          cart: Array.isArray(parsed.cart) ? parsed.cart.filter((line) => findProduct(line.productId) && Number.isInteger(line.quantity) && line.quantity > 0).map((line) => ({ ...line, quantity: Math.min(line.quantity, findProduct(line.productId)!.stock) })).filter((line) => line.quantity > 0) : [],
          favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter((id) => findProduct(id)) : [],
          orders: !apiMode && Array.isArray(parsed.orders) ? parsed.orders.filter((order) => order.id && Array.isArray(order.items)) : []
        });
      }
      if (!apiMode) {
        const session = sessionStorage.getItem("baotin-customer") || localStorage.getItem("baotin-customer");
        if (session) { const parsed = JSON.parse(session); if (parsed.role === "b2b" && typeof parsed.id === "string") setPreviewCustomer(parsed); }
      }
    } catch { /* Storage is optional; the shopping flow remains available without it. */ }
    setStorageReady(true);
    if (apiMode && !authStore.getState().auth.ready) void refreshSession(false);
  }, [authStore, refreshSession]);
  useEffect(() => {
    if (!apiMode) return;
    const unsubscribe = onUnauthorized(() => {
      const revision = authStore.getState().auth.revision;
      return () => {
        const current = authStore.getState().auth;
        if (current.revision !== revision || !current.user) return;
        clearAuth(); notifyAuthChange("logout");
        setToast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      };
    });
    const changed = (event: StorageEvent) => {
      if (event.key !== authEventKey || !event.newValue) return;
      try {
        const value = JSON.parse(event.newValue);
        if (value.type === "logout") { clearAuth(); void loadUserData(null, true, refreshVersion.current); }
        else if (value.type === "refresh") void refreshSession();
      } catch { /* Ignore invalid cross-tab notifications. */ }
    };
    window.addEventListener("storage", changed);
    return () => { unsubscribe(); window.removeEventListener("storage", changed); };
  }, [authStore, clearAuth, loadUserData, refreshSession]);

  useEffect(() => { if (ready) { try { localStorage.setItem(storageKey, JSON.stringify(apiMode ? { ...store, orders: [] } : store)); } catch {} } }, [store, ready]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);
  const notice = useCallback((message: string) => setToast(message), []);
  const add = (product: Product, quantity = 1) => {
    if (product.stock < 1) { notice("Sản phẩm hiện hết hàng."); return; }
    const amount = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
    setStore((state) => {
      const existing = state.cart.find((line) => line.productId === product.id);
      const nextQuantity = Math.min(product.stock, (existing?.quantity || 0) + amount);
      return { ...state, cart: existing ? state.cart.map((line) => line.productId === product.id ? { ...line, quantity: nextQuantity } : line) : [...state.cart, { productId: product.id, quantity: nextQuantity }] };
    });
    notice(`Đã thêm ${product.name} vào giỏ hàng.`);
  };
  const setQuantity = (id: string, quantity: number) => {
    const product = products.find((item) => item.id === id); if (!product) return;
    setStore((state) => ({ ...state, cart: state.cart.map((line) => line.productId === id ? { ...line, quantity: Math.max(1, Math.min(product.stock, Math.floor(quantity) || 1)) } : line) }));
  };
  const remove = (id: string) => setStore((state) => ({ ...state, cart: state.cart.filter((line) => line.productId !== id) }));
  const toggleFavorite = (id: string) => {
    const favorites = store.favorites.includes(id) ? store.favorites.filter((item) => item !== id) : [...store.favorites, id];
    const revision = authStore.getState().auth.revision;
    if (apiMode && sessionUser) { void api("/account/preferences", { method: "PATCH", body: JSON.stringify({ favorites }) }).then(() => { if (revision === authStore.getState().auth.revision) setStore((state) => ({ ...state, favorites })); }).catch((error) => { if (revision === authStore.getState().auth.revision) notice(error.message); }); }
    else setStore((state) => ({ ...state, favorites }));
  };
  const login = (value: Customer, remember: boolean) => {
    setPreviewCustomer(value);
    try {
      localStorage.removeItem("baotin-customer"); sessionStorage.removeItem("baotin-customer");
      (remember ? localStorage : sessionStorage).setItem("baotin-customer", JSON.stringify(value));
      [value.id, value.email, value.phone].filter(Boolean).forEach((identity) => localStorage.setItem(profileKey(identity), JSON.stringify(value)));
    } catch {}
  };
  const logout = async () => {
    if (apiMode) {
      try {
        const result = readApiSession(await api<unknown>("/auth/logout", { method: "POST" }));
        if (result.user !== null) throw new Error("Phản hồi đăng xuất không hợp lệ.");
        clearAuth(); notifyAuthChange("logout");
        await loadUserData(null, true, refreshVersion.current);
      } catch (error) { notice(error instanceof Error ? error.message : "Không thể đăng xuất."); }
      return;
    }
    setPreviewCustomer(null); try { localStorage.removeItem("baotin-customer"); sessionStorage.removeItem("baotin-customer"); } catch {}
  };
  const acceptLogin = async (value: unknown) => {
    const { user } = readApiSession(value);
    if (!user) throw new Error("Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.");
    const version = ++refreshVersion.current;
    refreshRequest.current = null;
    authStore.dispatch(authReceived(user)); notifyAuthChange("refresh");
    await loadUserData(user, true, version);
  };
  const loginWithPassword = async (identity: string, password: string, remember = false) => { await acceptLogin(await api<unknown>("/auth/login", { method: "POST", body: JSON.stringify({ identity, password, remember }) })); };
  const registerWithPassword = async (input: { name: string; company: string; phone: string; email: string; password: string }) => { await acceptLogin(await api<unknown>("/auth/register", { method: "POST", body: JSON.stringify(input) })); };
  const quoteOrder = useCallback((input: Pick<CheckoutDraft, "items" | "delivery" | "coupon">) => api<Quote>("/orders/quote", { method: "POST", body: JSON.stringify(input) }), []);
  const submitOrder = async (draft: CheckoutDraft, key: string) => {
    const revision = authStore.getState().auth.revision;
    const order = await api<Order>("/orders", { method: "POST", body: JSON.stringify(draft), headers: { "Idempotency-Key": key } });
    if (revision === authStore.getState().auth.revision) setStore((state) => ({ ...state, orders: [order, ...state.orders.filter((item) => item.id !== order.id)], cart: [], coupon: "" }));
    return order;
  };
  const updateProfile = async (value: Customer) => {
    if (!apiMode) { login(value, Boolean(localStorage.getItem("baotin-customer"))); return; }
    const version = refreshVersion.current;
    const result = readApiSession(await api<unknown>("/account/profile", { method: "PATCH", body: JSON.stringify({ name: value.name, company: value.company, phone: value.phone, email: value.email, tax: value.tax || "", address: value.address || "" }) }));
    if (version !== refreshVersion.current) return;
    refreshVersion.current++; refreshRequest.current = null;
    authStore.dispatch(authReceived(result.user)); notifyAuthChange("refresh");
  };
  const setCoupon = (coupon: string) => setStore((state) => ({ ...state, coupon }));
  const placeOrder = (order: Order) => setStore((state) => ({ ...state, orders: [order, ...state.orders], cart: [], coupon: "" }));

  return <Context.Provider value={{ ...store, products, categories, sessionUser, apiError, refreshSession, reloadCatalog, loginWithPassword, registerWithPassword, submitOrder, quoteOrder, updateProfile, customer, ready, notice, add, setQuantity, remove, toggleFavorite, login, logout, placeOrder, setCoupon }}>
    {apiError && <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-danger">{apiError}<button onClick={() => { void refreshSession(); }} className="ml-3 font-semibold underline">Thử lại</button></div>}
    {children}
    {toast && <div role="status" className="fixed bottom-6 left-3 right-3 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-lg border border-border bg-white p-4 text-sm shadow-card-hover sm:left-auto sm:right-6"><CheckCircle2 className="shrink-0 text-success" size={20} /><span className="flex-1">{toast}</span><button aria-label="Đóng thông báo" className="bt-icon-button" onClick={() => setToast("")}><X size={16} /></button></div>}
  </Context.Provider>;
}
export function useCommerce() { const value = useContext(Context); if (!value) throw new Error("CommerceProvider is required"); return value; }
