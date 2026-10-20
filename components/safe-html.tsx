"use client";

import { safeHtml } from "@/lib/safe-html";

interface SafeHtmlProps {
  html: string;
  className?: string;
  autoLink?: boolean;
  linksInNewTab?: boolean;
}

export function SafeHtml({ html, className = "", autoLink, linksInNewTab }: SafeHtmlProps) {
  const sanitized = safeHtml(html, { autoLink, linksInNewTab });

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
