"use client";

import { useState, useTransition } from "react";
import { adminDeleteUser, adminSetUserPassword } from "@/app/actions/admin";

const pillButton =
  "rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50";

function PasswordForm({ userId, onClose }: { userId: string; onClose: (saved: boolean) => void }) {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await adminSetUserPassword(userId, password);
      if (res.ok) onClose(true);
      else setError(res.error ?? "No se pudo cambiar la contraseña.");
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoComplete="new-password"
          autoFocus
          className="h-7 w-44 rounded-md border border-border bg-background px-2 text-xs"
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onClose(false);
          }}
          placeholder="Nueva contraseña (mín. 8)"
          type="text"
          value={password}
        />
        <button
          className={`${pillButton} border-primary/50 text-primary hover:bg-primary/10`}
          disabled={isPending || password.length < 8}
          onClick={handleSave}
          type="button"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button
          className={`${pillButton} border-border text-muted-foreground hover:bg-muted`}
          disabled={isPending}
          onClick={() => onClose(false)}
          type="button"
        >
          Cancelar
        </button>
      </div>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </div>
  );
}

export function AdminUserActions({ userId, userEmail, isSelf }: { userId: string; userEmail: string; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (deleted) return <span className="text-xs text-muted-foreground">Eliminado</span>;

  if (editing) {
    return (
      <PasswordForm
        onClose={(ok) => {
          setEditing(false);
          setSaved(ok);
        }}
        userId={userId}
      />
    );
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar al usuario ${userEmail}? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const res = await adminDeleteUser(userId);
      if (res.ok) setDeleted(true);
      else alert(res.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className={`${pillButton} border-border text-foreground hover:bg-muted`}
        onClick={() => {
          setSaved(false);
          setEditing(true);
        }}
        type="button"
      >
        Cambiar contraseña
      </button>
      {isSelf ? (
        <span className="text-xs text-muted-foreground">(tu cuenta)</span>
      ) : (
        <button
          className={`${pillButton} border-signal/40 text-signal hover:bg-signal/10`}
          disabled={isPending}
          onClick={handleDelete}
          type="button"
        >
          {isPending ? "Eliminando…" : "Eliminar"}
        </button>
      )}
      {saved ? <span className="text-xs text-success">Contraseña actualizada</span> : null}
    </div>
  );
}
