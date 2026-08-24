"use server";

import { revalidatePath } from "next/cache";
import { requireOpsSession } from "@/lib/ops-access";
import { prisma } from "@/lib/prisma";

export async function createInternalProvider(
  companyName: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireOpsSession();
    const name = companyName.trim();
    if (name.length < 2) return { ok: false, error: "Indicá un nombre de al menos 2 caracteres." };

    await prisma.providerProfile.create({
      data: { companyName: name },
    });

    revalidatePath("/admin/proveedores");
    revalidatePath("/admin/operaciones/inventory/new");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear proveedor." };
  }
}
