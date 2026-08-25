"use client";

import { useState, useTransition } from "react";
import { addAgencyClient, removeAgencyClient } from "@/app/actions/agency";
import { cn } from "@/lib/cn";
import { fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";
import { Alert, Button } from "@/components/ui";

type Client = {
  id: string;
  advertiser: {
    id: string;
    email: string;
    advertiserProfile: { legalName: string | null } | null;
    _count: { reservations: number };
  };
};

export function AgencyClientsManager({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleAdd() {
    if (!email.trim()) return;
    setError(null); setSuccess(null);
    startTransition(async () => {
      const res = await addAgencyClient(email.trim());
      if (res.ok) {
        setEmail("");
        setSuccess("Cliente agregado. Recargá la página para ver los cambios.");
      } else {
        setError(res.error ?? "Error.");
      }
    });
  }

  function handleRemove(advertiserId: string) {
    if (!confirm("¿Quitar este cliente?")) return;
    startTransition(async () => {
      const res = await removeAgencyClient(advertiserId);
      if (res.ok) setClients((prev) => prev.filter((c) => c.advertiser.id !== advertiserId));
      else alert(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Agregar cliente */}
      <div className={cn(surfaceCard(), "p-5 sm:p-6 space-y-4")}>
        <h2 className="text-base font-semibold text-foreground">Agregar anunciante</h2>
        <div>
          <label className={labelClass} htmlFor="client-email">Email del anunciante registrado</label>
          <input
            id="client-email"
            className={cn(fieldClass, "mt-1.5")}
            type="email"
            placeholder="anunciante@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Button disabled={isPending || !email.trim()} onClick={handleAdd} type="button">
          {isPending ? "Agregando…" : "Agregar cliente"}
        </Button>
      </div>

      {/* Lista de clientes */}
      {clients.length > 0 && (
        <div className={cn(surfaceCard(), "overflow-hidden")}>
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold text-foreground">Clientes ({clients.length})</h2>
          </div>
          <ul className="divide-y divide-border">
            {clients.map((c) => {
              const name = c.advertiser.advertiserProfile?.legalName ?? c.advertiser.email;
              return (
                <li key={c.id} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div>
                    <p className="font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">{c.advertiser.email} · {c.advertiser._count.reservations} solicitudes</p>
                  </div>
                  <button
                    className="rounded-full border border-signal/30 px-3 py-1 text-xs font-semibold text-signal hover:bg-signal/10 transition"
                    disabled={isPending}
                    onClick={() => handleRemove(c.advertiser.id)}
                    type="button"
                  >
                    Quitar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
