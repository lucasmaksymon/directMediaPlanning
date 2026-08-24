"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOpsSession } from "@/lib/ops-access";

export async function importAudienceReport(
  unitId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireOpsSession();
    const provider = String(formData.get("provider") ?? "estimated").trim();
    const impressions = Number(formData.get("impressions") ?? 0);
    const periodStart = new Date(String(formData.get("periodStart") ?? ""));
    const periodEnd = new Date(String(formData.get("periodEnd") ?? ""));

    if (!impressions || Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      return { ok: false, error: "Datos inválidos." };
    }

    await prisma.audienceReport.create({
      data: { inventoryUnitId: unitId, provider, impressions, periodStart, periodEnd },
    });

    revalidatePath(`/explorar/${unitId}`);
    revalidatePath("/admin/operaciones/analytics");
    return { ok: true };
  } catch {
    return { ok: false, error: "Sin permisos." };
  }
}
