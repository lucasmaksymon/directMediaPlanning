"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Banknote, CircleCheck, FileDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Result = { ok: true } | { ok: false; error: string };

const iconClass = "size-3.5";

function ActionControl({
  className,
  disabled,
  href,
  label,
  onClick,
  rowEdit,
  target,
  tone = "default",
  children,
}: {
  className?: string;
  disabled?: boolean;
  href?: string;
  label: string;
  onClick?: () => void;
  rowEdit?: boolean;
  target?: string;
  tone?: "default" | "accent" | "danger";
  children: ReactNode;
}) {
  const styles = cn(
    "inline-flex size-7 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50",
    tone === "default" && "text-muted-foreground hover:bg-muted hover:text-foreground",
    tone === "accent" && "text-led hover:bg-primary-subtle",
    tone === "danger" && "text-[var(--error)] hover:bg-[var(--error-subtle)]",
    className,
  );
  if (href) {
    return (
      <Link
        aria-label={label}
        className={styles}
        data-row-edit={rowEdit || undefined}
        href={href}
        rel={target ? "noreferrer" : undefined}
        target={target}
        title={label}
      >
        <LinkPending>{children}</LinkPending>
      </Link>
    );
  }
  return (
    <button aria-label={label} className={styles} disabled={disabled} onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}

function LinkPending({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className={cn(iconClass, "animate-spin text-led")} /> : children;
}

function confirmIcon(label?: string) {
  const text = (label ?? "").toLowerCase();
  if (text.includes("cobr")) return Banknote;
  if (text.includes("pag")) return CircleCheck;
  return CircleCheck;
}

export function ErpRowActions({
  editHref,
  pdfHref,
  confirmAction,
  confirmLabel,
  confirmPrompt,
  deleteAction,
  deleteConfirm = "¿Borrar este registro?",
  deleteLabel = "Borrar",
  actionTone = "danger",
}: {
  editHref?: string;
  pdfHref?: string;
  confirmAction?: () => Promise<Result>;
  confirmLabel?: string;
  confirmPrompt?: string;
  deleteAction?: () => Promise<Result>;
  deleteConfirm?: string;
  deleteLabel?: string;
  actionTone?: "danger" | "success";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ConfirmIcon = confirmIcon(confirmLabel);

  function run(action: () => Promise<Result>, prompt: string) {
    if (!confirm(prompt)) return;
    setError(null);
    start(async () => {
      const res = await action();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-0.5">
        {editHref ? (
          <ActionControl href={editHref} label="Editar" rowEdit>
            <Pencil className={iconClass} />
          </ActionControl>
        ) : null}
        {pdfHref ? (
          <ActionControl href={pdfHref} label="Abrir PDF" target="_blank">
            <FileDown className={iconClass} />
          </ActionControl>
        ) : null}
        {confirmAction ? (
          <ActionControl
            disabled={pending}
            label={confirmLabel ?? "Confirmar"}
            onClick={() => run(confirmAction, confirmPrompt ?? "¿Confirmar?")}
            tone="accent"
          >
            {pending ? <Loader2 className={cn(iconClass, "animate-spin")} /> : <ConfirmIcon className={iconClass} />}
          </ActionControl>
        ) : null}
        {deleteAction ? (
          <ActionControl
            disabled={pending}
            label={deleteLabel}
            onClick={() => run(deleteAction, deleteConfirm)}
            tone={actionTone === "success" ? "accent" : "danger"}
          >
            {pending ? <Loader2 className={cn(iconClass, "animate-spin")} /> : <Trash2 className={iconClass} />}
          </ActionControl>
        ) : null}
      </div>
      {error ? (
        <div
          className="flex w-64 max-w-[70vw] items-start gap-1.5 rounded-md border border-[var(--error)]/40 bg-[var(--error-subtle)] px-2 py-1.5 text-left text-[11px] leading-snug whitespace-normal text-[var(--error)]"
          role="alert"
        >
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button
            aria-label="Cerrar"
            className="shrink-0 rounded px-1 leading-none hover:bg-[var(--error)]/15"
            onClick={() => setError(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
