"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateProviderInventoryStatus, deleteProviderInventoryUnit } from "@/app/actions/provider";
import { InventoryStatus } from "@prisma/client";

type Props = {
  unitId: string;
  currentStatus: "draft" | "published" | "paused";
};

export function ProviderInventoryActions({ unitId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatus(status: InventoryStatus) {
    startTransition(async () => {
      const res = await updateProviderInventoryStatus(unitId, status);
      if (!res.ok) setError(res.error ?? "Error.");
    });
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este espacio? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      const res = await deleteProviderInventoryUnit(unitId);
      if (!res.ok) setError(res.error ?? "Error.");
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && <span className="text-xs text-signal">{error}</span>}
      <Link
        href={`/provider/inventario/${unitId}/editar`}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
      >
        Editar
      </Link>
      <Link
        href={`/provider/inventario/${unitId}/disponibilidad`}
        className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
      >
        Calendario
      </Link>
      {currentStatus !== "published" && (
        <button
          className="rounded-full border border-led/40 px-3 py-1 text-xs font-semibold text-led hover:bg-led/10 transition disabled:opacity-50"
          disabled={isPending}
          onClick={() => handleStatus(InventoryStatus.published)}
          type="button"
        >
          Publicar
        </button>
      )}
      {currentStatus === "published" && (
        <button
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted transition disabled:opacity-50"
          disabled={isPending}
          onClick={() => handleStatus(InventoryStatus.paused)}
          type="button"
        >
          Pausar
        </button>
      )}
      <button
        className="rounded-full border border-signal/30 px-3 py-1 text-xs font-semibold text-signal hover:bg-signal/10 transition disabled:opacity-50"
        disabled={isPending}
        onClick={handleDelete}
        type="button"
      >
        Eliminar
      </button>
    </div>
  );
}
