"use client";

import { useEffect, useRef } from "react";

export function AdminSelectionCheckbox({ checked, mixed = false, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { mixed?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed; }, [mixed]);
  return <input {...props} ref={ref} type="checkbox" checked={checked} className="h-4 w-4 shrink-0 accent-blue-brand" />;
}
