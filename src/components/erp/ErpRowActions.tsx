"use client";

import Link from "next/link";
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
  target,
  tone = "default",
  children,
}: {
  className?: string;
  disabled?: boolean;
  href?: string;
  label: string;
  onClick?: () => void;
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
      <Link aria-label={label} className={styles} href={href} rel={target ? "noreferrer" : undefined} target={target} title={label}>
        {children}
      </Link>
    );
  }
  return (
    <button aria-label={label} className={styles} disabled={disabled} onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
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
    <div className="flex items-center justify-end gap-0.5">
      {editHref ? (
        <ActionControl href={editHref} label="Editar">
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
      {error ? (
        <span className="max-w-[8rem] truncate text-[10px] text-[var(--error)]" role="alert" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
