"use client";

import { useState, useTransition } from "react";
import { adminDeleteUser } from "@/app/actions/admin";

export function AdminUserActions({ userId, userEmail, isSelf }: { userId: string; userEmail: string; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (isSelf) return <span className="text-xs text-muted-foreground">(tu cuenta)</span>;
  if (done) return <span className="text-xs text-muted-foreground">Eliminado</span>;

  function handleDelete() {
    if (!confirm(`¿Eliminar al usuario ${userEmail}? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const res = await adminDeleteUser(userId);
      if (res.ok) setDone(true);
      else alert(res.error);
    });
  }

  return (
    <button
      className="rounded-full border border-signal/40 px-3 py-1 text-xs font-semibold text-signal transition hover:bg-signal/10 disabled:opacity-50"
      disabled={isPending}
      onClick={handleDelete}
      type="button"
    >
      {isPending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
