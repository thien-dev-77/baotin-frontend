"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { RichTextEditorProps } from "./rich-text-editor";

const EDITOR_ROOT_MARGIN = "200px";
const Editor = dynamic(() => import("./rich-text-editor").then(module => module.RichTextEditor), {
  ssr: false,
  loading: () => <p role="status" className="py-3 text-sm text-text-secondary">Đang tải trình soạn thảo...</p>,
});

export function LazyRichTextEditor(props: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") { setActive(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setActive(true); observer.disconnect();
    }, { rootMargin: EDITOR_ROOT_MARGIN });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} data-rich-text-field={props.id} style={{ minHeight: props.minHeight || "200px" }}>
    {active ? <Editor {...props} /> : <button id={props.id} type="button" disabled={props.disabled} className="bt-input !h-auto py-3 text-left text-text-secondary" style={{ minHeight: props.minHeight || "200px" }} onClick={() => setActive(true)}>Mở trình soạn thảo</button>}
  </div>;
}
