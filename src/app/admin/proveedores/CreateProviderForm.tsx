"use client";

import { useState, useTransition } from "react";
import { createInternalProvider } from "@/app/actions/admin-providers";
import { btnPrimary, fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function CreateProviderForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await createInternalProvider(name);
      if (res.ok) {
        setName("");
        setSuccess(true);
      } else {
        setError(res.error ?? "Error");
      }
    });
  }

  return (
    <form className={cn(surfaceCard(), "w-full space-y-4 p-5 sm:max-w-xl")} onSubmit={handleSubmit}>
      <h2 className="text-base font-semibold text-foreground">Alta de proveedor</h2>
      <div>
        <label className={labelClass} htmlFor="companyName">
          Nombre comercial
        </label>
        <input
          className={cn(fieldClass, "mt-1.5")}
          id="companyName"
          onChange={(e) => setName(e.target.value)}
          required
          type="text"
          value={name}
        />
      </div>
      {error && <p className="text-sm text-signal">{error}</p>}
      {success && <p className="text-sm text-led">Proveedor creado. Recargá para ver la lista.</p>}
      <button className={btnPrimary} disabled={pending || !name.trim()} type="submit">
        {pending ? "Guardando…" : "Crear proveedor"}
      </button>
    </form>
  );
}
