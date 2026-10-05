"use client";
import { ErrorState } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="bt-container"><ErrorState retry={reset} /></main>; }
