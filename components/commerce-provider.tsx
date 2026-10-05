"use client";

import { CartLine, Customer, Order, Product, catalog, categoryCatalog, findProduct } from "@/lib/catalog";
import type { Category, SessionUser } from "../shared/types";
import type { ApiSession, CatalogResponse, CheckoutDraft, Quote } from "../shared/api";
import { api, apiMode } from "@/lib/api-client";
import { CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Store = { cart: CartLine[]; favorites: string[]; orders: Order[]; coupon: string };
type Commerce = Store & {
  products: Product[]; categories: Category[]; sessionUser: SessionUser | null; apiError: string;
  refreshSession: () => Promise<void>; reloadCatalog: () => Promise<void>;
  loginWithPassword: (identity: string, password: string, remember?: boolean) => Promise<void>;
  registerWithPassword: (input: { name: string; company: string; phone: string; email: string; password: string }) => Promise<void>;
  submitOrder: (draft: CheckoutDraft, key: string) => Promise<Order>;
  quoteOrder: (input: Pick<CheckoutDraft, "items" | "delivery" | "coupon">) => Promise<Quote>;
  updateProfile: (value: Customer) => Promise<void>;
  customer: Customer | null; ready: boolean; notice: (message: string) => void;
  add: (product: Product, quantity?: number) => void; setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void; toggleFavorite: (id: string) => void;
  login: (customer: Customer, remember: boolean) => void; logout: () => void;
  placeOrder: (order: Order) => void;
  setCoupon: (coupon: string) => void;
};
const Context = createContext<Commerce | null>(null);
const initial: Store = { cart: [], favorites: [], orders: [], coupon: "" };
const storageKey = apiMode ? "baotin-commerce-api-v1" : "baotin-commerce-v1";

const profileKey = (identity: string) => `baotin-profile-${identity.trim().toLowerCase().replace(/\s+/g, "")}`;
export function readPreviewCustomer(identity: string): Customer | null {
  try {
    const value = JSON.parse(localStorage.getItem(profileKey(identity)) || "null");
    return value?.role === "b2b" && typeof value.id === "string" && typeof value.name === "string" && typeof value.email === "string" && typeof value.phone === "string" ? value : null;
  } catch { return null; }
}

export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store>(initial);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [products, setProducts] = useState<Product[]>(apiMode ? [] : catalog);
  const [categories, setCategories] = useState<Category[]>(categoryCatalog);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [apiError, setApiError] = useState("");
  const sessionIdentity = useRef<string | null>(null);
  const refreshVersion = useRef(0);
  const reloadCatalog = useCallback(async () => {
    if (!apiMode) return;
    const result = await api<CatalogResponse>("/catalog");
    setProducts(result.products); setCategories(result.categories);
  }, []);
  const refreshSession = useCallback(async () => {
    if (!apiMode) return;
    const version = ++refreshVersion.current;
    try {
      const session = await api<ApiSession>("/auth/session");
      if (version !== refreshVersion.current) return;
      const identity = session.user?.id || null;
      if (identity !== sessionIdentity.current) {
        setStore((state) => ({ ...state, orders: [], favorites: [] }));
        setProducts((state) => state.map(({ customerPrice, ...retail }) => retail));
        sessionIdentity.current = identity;
      }
      if (session.user?.customer?.status !== "active") setProducts((state) => state.map(({ customerPrice, ...retail }) => retail));
      setSessionUser(session.user); setCustomer(session.user?.customer || null);
      const [result, orders] = await Promise.all([api<CatalogResponse>("/catalog"), api<Order[]>("/orders")]);
      let favorites: string[] | undefined;
      if (session.user) favorites = (await api<{ favorites: string[] }>("/account")).favorites;
      if (version !== refreshVersion.current) return;
      setProducts(result.products); setCategories(result.categories);
      setStore((state) => ({ ...state, orders, ...(favorites ? { favorites } : {}) }));
      setApiError("");
    } catch (error) { if (version === refreshVersion.current) setApiError(error instanceof Error ? error.message : "Không thể kết nối API."); }
    finally { if (version === refreshVersion.current) setReady(true); }
  }, []);

  useEffect(() => {
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
      const session = sessionStorage.getItem("baotin-customer") || localStorage.getItem("baotin-customer");
      if (!apiMode && session) { const parsed = JSON.parse(session); if (parsed.role === "b2b" && typeof parsed.id === "string") setCustomer(parsed); }
    } catch { /* Storage is optional; the shopping flow remains available without it. */ }
    if (apiMode) void refreshSession(); else setReady(true);
  }, [refreshSession]);
  useEffect(() => {
    if (!apiMode) return;
    const refresh = () => { void refreshSession(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refreshSession]);

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
    if (apiMode && sessionUser) { void api("/account/preferences", { method: "PATCH", body: JSON.stringify({ favorites }) }).then(() => setStore((state) => ({ ...state, favorites }))).catch((error) => notice(error.message)); }
    else setStore((state) => ({ ...state, favorites }));
  };
  const login = (value: Customer, remember: boolean) => {
    setCustomer(value);
    try {
      localStorage.removeItem("baotin-customer"); sessionStorage.removeItem("baotin-customer");
      (remember ? localStorage : sessionStorage).setItem("baotin-customer", JSON.stringify(value));
      [value.id, value.email, value.phone].filter(Boolean).forEach((identity) => localStorage.setItem(profileKey(identity), JSON.stringify(value)));
    } catch {}
  };
  const logout = () => {
    if (apiMode) { void api("/auth/logout", { method: "POST" }).then(refreshSession).catch((error) => notice(error.message)); return; }
    setCustomer(null); try { localStorage.removeItem("baotin-customer"); sessionStorage.removeItem("baotin-customer"); } catch {}
  };
  const loginWithPassword = async (identity: string, password: string, remember = false) => { await api("/auth/login", { method: "POST", body: JSON.stringify({ identity, password, remember }) }); await refreshSession(); };
  const registerWithPassword = async (input: { name: string; company: string; phone: string; email: string; password: string }) => { await api("/auth/register", { method: "POST", body: JSON.stringify(input) }); await refreshSession(); };
  const quoteOrder = useCallback((input: Pick<CheckoutDraft, "items" | "delivery" | "coupon">) => api<Quote>("/orders/quote", { method: "POST", body: JSON.stringify(input) }), []);
  const submitOrder = async (draft: CheckoutDraft, key: string) => {
    const order = await api<Order>("/orders", { method: "POST", body: JSON.stringify(draft), headers: { "Idempotency-Key": key } });
    setStore((state) => ({ ...state, orders: [order, ...state.orders.filter((item) => item.id !== order.id)], cart: [], coupon: "" }));
    return order;
  };
  const updateProfile = async (value: Customer) => {
    if (!apiMode) { login(value, Boolean(localStorage.getItem("baotin-customer"))); return; }
    const result = await api<ApiSession>("/account/profile", { method: "PATCH", body: JSON.stringify({ name: value.name, company: value.company, phone: value.phone, email: value.email, tax: value.tax || "", address: value.address || "" }) });
    setSessionUser(result.user); setCustomer(result.user?.customer || null);
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
