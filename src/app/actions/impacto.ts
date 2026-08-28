"use server";

import { ensureInventoryImpacto } from "@/lib/inventory/estimate-impacto";
import { requireOpsSession } from "@/lib/ops-access";

export async function ensureUnitImpacto(unitId: string) {
  try {
    await requireOpsSession();
    const result = await ensureInventoryImpacto(unitId);
    if (!result) return { ok: false as const, error: "Unidad no encontrada." };
    return { ok: true as const, ...result };
  } catch {
    return { ok: false as const, error: "Sin permisos." };
  }
}
