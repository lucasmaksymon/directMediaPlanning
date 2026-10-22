"use client";

import { useEffect, useState, useTransition } from "react";
import { adminCreateUser, adminDeleteUser, adminSetUserPassword, adminSetUserRole } from "@/app/actions/admin";
import { ROLE_LABELS } from "@/lib/roles";
import { Input, Select } from "@/components/ui";

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
        <Input
          autoComplete="new-password"
          autoFocus
          className="h-9 w-52 py-1.5 text-xs"
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

export function AdminCreateUser() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const res = await adminCreateUser(formData);
      if (res.ok) setOk(true);
      else setError(res.error ?? "No se pudo crear el usuario.");
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-xs text-muted-foreground">
        Email
        <Input className="w-56" name="email" required type="email" />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        Contraseña
        <Input className="w-44" minLength={8} name="password" required type="text" />
      </label>
      <label className="w-44 space-y-1 text-xs text-muted-foreground">
        Rol
        <Select defaultValue="planning" name="role">
          <option value="planning">Planificación</option>
          <option value="administration">Administración</option>
          <option value="admin">Admin</option>
        </Select>
      </label>
      <button className={`${pillButton} h-8 border-primary/50 text-primary hover:bg-primary/10`} disabled={isPending} type="submit">
        {isPending ? "Creando…" : "Crear usuario"}
      </button>
      {ok ? <span className="text-xs text-success">Usuario creado</span> : null}
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </form>
  );
}

function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const internal = role === "admin" || role === "planning" || role === "administration";
  const [current, setCurrent] = useState(internal ? role : "");

  useEffect(() => {
    setCurrent(internal ? role : "");
  }, [internal, role]);

  function handleChange(next: string) {
    if (!next || next === current) return;
    const previous = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const res = await adminSetUserRole(userId, next);
      if (!res.ok) {
        setCurrent(previous);
        setError(res.error ?? "No se pudo cambiar el rol.");
      }
    });
  }

  return (
    <span className="inline-flex w-40 flex-col">
      <Select
        compact
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        title={internal ? "Cambiar rol" : "Este rol se asigna en el registro"}
        value={current}
      >
        {internal ? null : <option value="">{ROLE_LABELS[role] ?? role}</option>}
        <option value="planning">Planificación</option>
        <option value="administration">Administración</option>
        <option value="admin">Admin</option>
      </Select>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </span>
  );
}

export function AdminUserActions({
  userId,
  userEmail,
  isSelf,
  role,
}: {
  userId: string;
  userEmail: string;
  isSelf: boolean;
  role: string;
}) {
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
      {isSelf ? null : <RoleSelect role={role} userId={userId} />}
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
