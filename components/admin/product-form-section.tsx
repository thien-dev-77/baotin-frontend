import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function ProductFormSection({ id, title, description, icon: Icon, actions, children }: {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return <section aria-labelledby={`${id}-heading`} className="min-w-0 rounded-xl border border-border bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-border bg-section px-4 py-4 sm:px-5">
      <div className="flex w-full min-w-0 items-start gap-3 sm:w-auto sm:flex-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-primary"><Icon size={18} aria-hidden="true" /></span>
        <div className="min-w-0 self-center">
          <h2 id={`${id}-heading`} className="text-base font-semibold text-primary">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-text-secondary">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </header>
    <div className="min-w-0 p-4 sm:p-5">{children}</div>
  </section>;
}
