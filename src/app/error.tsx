"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { pageScroll } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className={cn(
        pageScroll,
        "mx-auto flex max-w-lg flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-error">Error</p>
      <h1 className="nm-page-title">Algo salió mal</h1>
      <p className="nm-secondary">
        No pudimos cargar esta vista. Probá de nuevo; si el problema continúa, contactá a soporte.
      </p>
      <Button onClick={reset} type="button" variant="primary">
        Reintentar
      </Button>
    </main>
  );
}
