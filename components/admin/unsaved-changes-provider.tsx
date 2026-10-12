"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProgress } from "@bprogress/react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button, Modal } from "../ui";
import { UnsavedGuardContext } from "@/lib/unsaved-form";

const HISTORY_INDEX = "__btFormIndex";
type TraverseEvent = Event & { navigationType: string; destination: { key: string; url: string } };
type BrowserNavigation = EventTarget & { traverseTo: (key: string) => unknown };

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const admin = usePathname().startsWith("/admin");
  const { stop } = useProgress();
  const forms = useRef(new Map<string, { dirty: boolean; busy: boolean }>());
  const pending = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const register = useCallback((id: string, dirty: boolean, busy: boolean) => { forms.current.set(id, { dirty, busy }); }, []);
  const remove = useCallback((id: string) => { forms.current.delete(id); }, []);
  const confirm = useCallback((proceed: () => void) => { if (pending.current) return; pending.current = proceed; setOpen(true); }, []);
  const leave = useCallback((proceed: () => void) => {
    const states = Array.from(forms.current.values());
    if (states.some(form => form.busy)) return;
    if (states.some(form => form.dirty)) confirm(() => { forms.current.clear(); proceed(); });
    else proceed();
  }, [confirm]);
  const value = useMemo(() => ({ register, remove, confirm, leave }), [register, remove, confirm, leave]);
  const cancel = useCallback(() => { pending.current = null; setOpen(false); stop(); }, [stop]);
  useEffect(() => {
    const changed = () => Array.from(forms.current.values()).some(form => form.dirty || form.busy);
    const loading = () => Array.from(forms.current.values()).some(form => form.busy);
    const beforeUnload = (event: BeforeUnloadEvent) => { if (changed()) { event.preventDefault(); event.returnValue = ""; } };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !changed()) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || link.target === "_blank") return;
      const url = new URL(link.href, location.href);
      if (url.href === location.href || (url.pathname === location.pathname && url.search === location.search && url.hash)) return;
      event.preventDefault(); event.stopPropagation(); stop();
      if (loading()) return;
      confirm(() => { forms.current.clear(); if (url.origin === location.origin) router.push(`${url.pathname}${url.search}${url.hash}`); else location.assign(url.href); });
    };
    // Keep Next's history state intact; restore the current entry before asking about Back/Forward.
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    let index = typeof history.state?.[HISTORY_INDEX] === "number" ? history.state[HISTORY_INDEX] : 0;
    let restoring = false;
    let bypass = false;
    let approvedTraverse = false;
    let continueBack: (() => void) | null = null;
    originalReplace.call(history, { ...history.state, [HISTORY_INDEX]: index }, "");
    const push: History["pushState"] = function(data, unused, url) { index++; originalPush.call(history, { ...data, [HISTORY_INDEX]: index }, unused, url); };
    const replace: History["replaceState"] = function(data, unused, url) { originalReplace.call(history, { ...data, [HISTORY_INDEX]: index }, unused, url); };
    history.pushState = push; history.replaceState = replace;
    const pop = (event: PopStateEvent) => {
      const target = event.state?.[HISTORY_INDEX];
      if (typeof target !== "number") return;
      if (restoring) { event.stopImmediatePropagation(); restoring = false; stop(); if (!loading() && continueBack) confirm(continueBack); continueBack = null; return; }
      if (bypass || !changed() || target === index) { bypass = false; index = target; return; }
      event.stopImmediatePropagation(); stop();
      const delta = target - index;
      restoring = true;
      continueBack = () => { forms.current.clear(); bypass = true; history.go(delta); };
      history.go(-delta);
    };
    const navigation = (window as Window & { navigation?: BrowserNavigation }).navigation;
    const navigate = (raw: Event) => {
      const event = raw as TraverseEvent;
      if (approvedTraverse) { approvedTraverse = false; return; }
      if (event.navigationType !== "traverse" || !event.cancelable || !changed()) return;
      const target = new URL(event.destination.url);
      if (target.pathname === location.pathname && target.search === location.search) return;
      event.preventDefault(); stop();
      if (loading()) return;
      confirm(() => { forms.current.clear(); approvedTraverse = true; bypass = true; navigation?.traverseTo(event.destination.key); });
    };
    navigation?.addEventListener("navigate", navigate);
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", pop, true);
    return () => {
      document.removeEventListener("click", click, true); window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("popstate", pop, true);
      navigation?.removeEventListener("navigate", navigate);
      if (history.pushState === push) history.pushState = originalPush;
      if (history.replaceState === replace) history.replaceState = originalReplace;
    };
  }, [router, stop, confirm]);
  return <UnsavedGuardContext.Provider value={admin ? value : null}>{children}<Modal open={open} onClose={cancel} title="Bỏ thay đổi chưa lưu?"><p className="text-sm leading-6 text-text-secondary">Thay đổi của bạn chưa được lưu.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={cancel}><ArrowLeft size={16} />Tiếp tục chỉnh sửa</Button><Button onClick={() => { const proceed = pending.current; pending.current = null; setOpen(false); proceed?.(); }}><Trash2 size={16} />Bỏ thay đổi</Button></div></Modal></UnsavedGuardContext.Provider>;
}
