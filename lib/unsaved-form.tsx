"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type RefObject } from "react";

export type UnsavedGuard = {
  register: (id: string, dirty: boolean, busy: boolean) => void;
  remove: (id: string) => void;
  confirm: (proceed: () => void) => void;
  leave: (proceed: () => void) => void;
};
export const UnsavedGuardContext = createContext<UnsavedGuard | null>(null);

function snapshot(root: HTMLElement, extra: string) {
  const controls = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
  return JSON.stringify([extra, controls.filter(control => !["file", "submit", "button", "hidden"].includes(control.type)).map(control => [control.name || control.id, control.type, control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type) ? control.checked : control.value])]);
}

export function useUnsavedForm(ref: RefObject<HTMLElement | null>, enabled = true, busy = false, extra = "") {
  const guard = useContext(UnsavedGuardContext);
  const id = useId();
  const baseline = useRef<string | null>(null);
  const baselineExtra = useRef(extra);
  const edited = useRef(false);
  const extraRef = useRef(extra);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  extraRef.current = extra;
  const [dirty, setDirty] = useState(false);
  const check = useCallback(() => {
    if (!ref.current || baseline.current === null) return;
    const changed = snapshot(ref.current, extraRef.current) !== baseline.current;
    guard?.register(id, changed, busyRef.current);
    setDirty(changed);
  }, [ref, guard, id]);
  useEffect(() => {
    if (!enabled || !guard || !ref.current) return;
    const root = ref.current;
    baseline.current = snapshot(root, extraRef.current);
    baselineExtra.current = extraRef.current;
    edited.current = false;
    setDirty(false);
    let frame = 0;
    const scheduleCheck = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };
    const changed = () => {
      edited.current = true;
      guard.register(id, snapshot(root, extraRef.current) !== baseline.current, busyRef.current);
      // Native listener microtasks can run before React handles a controlled input.
      scheduleCheck();
    };
    const clicked = (event: MouseEvent) => { if (event.target instanceof Element && event.target.closest("form")) changed(); };
    root.addEventListener("input", changed);
    root.addEventListener("change", changed);
    root.addEventListener("click", clicked);
    const observer = new MutationObserver(() => {
      if (!edited.current) baseline.current = snapshot(root, extraRef.current);
      else scheduleCheck();
    });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["value", "checked"] });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); root.removeEventListener("input", changed); root.removeEventListener("change", changed); root.removeEventListener("click", clicked); baseline.current = null; guard.remove(id); };
  }, [ref, enabled, guard, id, check]);
  useEffect(() => { if (extra !== baselineExtra.current) edited.current = true; check(); }, [extra, check]);
  useEffect(() => { if (enabled) guard?.register(id, dirty, busy); }, [guard, id, enabled, dirty, busy]);
  const markSaved = useCallback(() => {
    baseline.current = ref.current ? snapshot(ref.current, extraRef.current) : null;
    baselineExtra.current = extraRef.current;
    edited.current = false;
    setDirty(false);
    guard?.register(id, false, false);
  }, [guard, id, ref]);
  const close = useCallback((proceed: () => void) => {
    if (busy) return;
    if (dirty && guard) guard.confirm(() => { markSaved(); proceed(); });
    else proceed();
  }, [busy, dirty, guard, markSaved]);
  return { dirty, markSaved, close };
}
