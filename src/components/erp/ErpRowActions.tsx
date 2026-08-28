"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Result = { ok: true } | { ok: false; error: string };

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
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
      {editHref ? (
        <Link className="font-semibold text-led hover:underline" href={editHref}>
          Editar
        </Link>
      ) : null}
      {pdfHref ? (
        <a className="font-semibold text-foreground hover:underline" href={pdfHref} rel="noreferrer" target="_blank">
          PDF
        </a>
      ) : null}
      {confirmAction ? (
        <button
          className="font-semibold text-led hover:underline disabled:opacity-50"
          disabled={pending}
          onClick={() => run(confirmAction, confirmPrompt ?? "¿Confirmar?")}
          type="button"
        >
          {pending ? "…" : confirmLabel ?? "Confirmar"}
        </button>
      ) : null}
      {deleteAction ? (
        <button
          className={
            actionTone === "success"
              ? "font-semibold text-led hover:underline disabled:opacity-50"
              : "font-semibold text-[var(--error)] hover:underline disabled:opacity-50"
          }
          disabled={pending}
          onClick={() => run(deleteAction, deleteConfirm)}
          type="button"
        >
          {pending ? "…" : deleteLabel}
        </button>
      ) : null}
      {error ? <span className="basis-full text-[var(--error)]">{error}</span> : null}
    </div>
  );
}
