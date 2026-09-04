"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useState, useTransition, type ReactNode } from "react";
import { Alert, Button, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";

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
  modalSize = "xl",
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
  modalSize?: "sm" | "lg" | "xl";
}) {
  const router = useRouter();
  const formId = `erp-form${useId().replace(/:/g, "")}`;
  const editing = Boolean(cancelHref);
  const [open, setOpen] = useState(defaultOpen ?? (editing || !collapsible));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const close = useCallback(() => {
    setError(null);
    setOpen(false);
    if (cancelHref) router.replace(cancelHref);
  }, [cancelHref, router]);

  return (
    <div className={cn("flex items-center justify-end", className)}>
      {collapsible ? (
        <Button onClick={() => setOpen(true)} size="sm" type="button">
          {openLabel ?? (editing ? "Nueva" : title) ?? "Nueva"}
        </Button>
      ) : null}
      <Modal
        footer={
          <>
            <Button disabled={pending} form={formId} size="sm" type="submit">
              {pending ? "Guardando…" : submitLabel}
            </Button>
            <Button onClick={close} size="sm" type="button" variant="ghost">
              Cancelar
            </Button>
          </>
        }
        onClose={close}
        open={open}
        size={modalSize}
        title={title}
      >
        <form
          className="erp-form-compact space-y-2.5"
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            setError(null);
            start(async () => {
              const res = await action(data);
              if (res.ok) {
                if (resetOnSuccess) form.reset();
                setOpen(false);
                if (cancelHref) router.replace(cancelHref);
                router.refresh();
              } else {
                setError(res.error);
              }
            });
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
          {error ? <Alert variant="error">{error}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}
