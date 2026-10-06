"use client";

import { Suspense, useEffect, type MouseEvent } from "react";
import { ProgressProvider, useProgress } from "@bprogress/react";
import { usePathname, useSearchParams } from "next/navigation";

const startPosition = 0.12;
const delay = 80;
const options = {
  showSpinner: false,
  speed: 180,
  easing: "ease-out",
  trickleSpeed: 350,
  template:
    '<div class="bar" role="progressbar" aria-label="Đang tải trang"></div>',
};

function changesPage(url: URL) {
  return (
    url.origin === window.location.origin &&
    (url.pathname !== window.location.pathname ||
      url.search !== window.location.search)
  );
}

function NavigationEvents() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const { start, stop } = useProgress();
  useEffect(() => {
    stop();
  }, [pathname, query, stop]);

  useEffect(() => {
    const navigate = () => {
      const target = new URL(window.location.href);
      if (
        target.pathname !== pathname ||
        target.searchParams.toString() !== query
      ) {
        start(startPosition, delay);
      }
    };
    window.addEventListener("popstate", navigate);
    return () => window.removeEventListener("popstate", navigate);
  }, [pathname, query, start]);

  return null;
}

function NavigationContent({ children }: { children: React.ReactNode }) {
  const { start } = useProgress();
  const click = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (
      !anchor ||
      anchor.hasAttribute("download") ||
      (anchor.target && anchor.target !== "_self")
    )
      return;
    if (
      target.closest(
        '[data-prevent-progress="true"], [data-disable-progress="true"]',
      )
    )
      return;
    if (changesPage(new URL(anchor.href, window.location.href)))
      start(startPosition, delay);
  };

  // React capture also receives clicks replayed during selective hydration.
  return (
    <div className="contents" onClickCapture={click}>
      {children}
    </div>
  );
}

export function NavigationProgress({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProgressProvider
      height="3px"
      color="var(--color-blue)"
      options={options}
      delay={delay}
      stopDelay={0}
      startPosition={startPosition}
    >
      <Suspense fallback={null}>
        <NavigationEvents />
      </Suspense>
      <NavigationContent>{children}</NavigationContent>
    </ProgressProvider>
  );
}
