"use server";

import { DealType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOpsSession } from "@/lib/ops-access";

export async function upsertProgrammaticDeal(
  unitId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireOpsSession();
    const dealType = String(formData.get("dealType") ?? "open") as DealType;
    const floorPrice = Number(formData.get("floorPrice") ?? 0);
    const openRtbUnitId = String(formData.get("openRtbUnitId") ?? "").trim() || undefined;

    if (floorPrice <= 0) return { ok: false, error: "Floor price inválido." };

    const existing = await prisma.programmaticDeal.findFirst({
      where: { inventoryUnitId: unitId, dealType },
    });

    if (existing) {
      await prisma.programmaticDeal.update({
        where: { id: existing.id },
        data: { floorPrice, openRtbUnitId, isActive: true },
      });
    } else {
      await prisma.programmaticDeal.create({
        data: { inventoryUnitId: unitId, dealType, floorPrice, openRtbUnitId },
      });
    }

    revalidatePath("/admin/operaciones/programmatic");
    return { ok: true };
  } catch {
    return { ok: false, error: "Sin permisos." };
  }
}

export async function createSlotAvailability(
  unitId: string,
  slotStart: Date,
  slotEnd: Date,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireOpsSession();
    await prisma.slotAvailability.create({
      data: { unitId, slotStart, slotEnd, state: "available" },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Error." };
  }
}
