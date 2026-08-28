"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Alert, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { surfaceCard } from "@/lib/ui-classes";

type ActionResult = { ok: true } | { ok: false; error: string };

export function ErpForm({
  action,
  children,
  submitLabel = "Guardar",
  title,
  className,
  resetOnSuccess = true,
  cancelHref,
  defaultOpen,
  collapsible = true,
  openLabel,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  submitLabel?: string;
  title?: string;
  className?: string;
  resetOnSuccess?: boolean;
  cancelHref?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  openLabel?: string;
}) {
  const router = useRouter();
  const editing = Boolean(cancelHref);
  const [open, setOpen] = useState(defaultOpen ?? (editing || !collapsible));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  if (collapsible && !open) {
    return (
      <div className={cn("flex items-center justify-end", className)}>
        <Button onClick={() => setOpen(true)} size="sm" type="button">
          {openLabel ?? title ?? "Nueva"}
        </Button>
      </div>
    );
  }

  return (
    <form
      className={cn(surfaceCard(), "erp-form-compact space-y-2.5 p-3", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setError(null);
        setOk(false);
        start(async () => {
          const res = await action(data);
          if (res.ok) {
            setOk(true);
            if (resetOnSuccess) form.reset();
            if (collapsible && !editing) setOpen(false);
            router.refresh();
          } else {
            setError(res.error);
          }
        });
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
        {collapsible && !editing ? (
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
            type="button"
          >
            Cerrar
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {ok ? <Alert variant="success">Guardado.</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} size="sm" type="submit">
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {cancelHref ? (
          <a className="text-sm text-muted-foreground hover:text-foreground" href={cancelHref}>
            Cancelar
          </a>
        ) : null}
      </div>
    </form>
  );
}
