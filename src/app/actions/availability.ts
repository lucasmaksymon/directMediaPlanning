"use server";

import { SlotState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { OpsAccessError, requireOpsSession } from "@/lib/ops-access";
import { prisma } from "@/lib/prisma";

export type AvailabilityActionResult = { ok: boolean; error?: string };

async function assertUnitAccess(unitId: string): Promise<{ isAdmin: boolean; providerId?: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new OpsAccessError("No autenticado.");

  if (session.user.role === "admin") {
    await requireOpsSession();
    const unit = await prisma.inventoryUnit.findFirst({ where: { id: unitId }, select: { id: true } });
    if (!unit) throw new OpsAccessError("Unidad no encontrada.");
    return { isAdmin: true };
  }

  if (session.user.role === "provider") {
    const profile = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) throw new OpsAccessError("Perfil de proveedor no encontrado.");
    const unit = await prisma.inventoryUnit.findFirst({
      where: { id: unitId, providerId: profile.id },
      select: { id: true },
    });
    if (!unit) throw new OpsAccessError("No tenés acceso a este espacio.");
    return { isAdmin: false, providerId: profile.id };
  }

  throw new OpsAccessError("Sin permisos.");
}

export async function createAvailabilityBlock(
  unitId: string,
  startsAt: Date,
  endsAt: Date,
  state: SlotState = SlotState.available,
): Promise<AvailabilityActionResult> {
  try {
    await assertUnitAccess(unitId);
    if (endsAt <= startsAt) return { ok: false, error: "La fecha de fin debe ser posterior a la de inicio." };

    await prisma.availabilityBlock.create({
      data: { unitId, startsAt, endsAt, state },
    });

    revalidateAvailabilityPaths(unitId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof OpsAccessError ? e.message : "Error al crear bloque." };
  }
}

export async function deleteAvailabilityBlock(blockId: string): Promise<AvailabilityActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "No autenticado." };

    const block = await prisma.availabilityBlock.findFirst({
      where: { id: blockId },
      include: { unit: { select: { providerId: true } } },
    });
    if (!block) return { ok: false, error: "Bloque no encontrado." };

    if (session.user.role === "provider") {
      const profile = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } });
      if (!profile || block.unit.providerId !== profile.id) {
        return { ok: false, error: "Sin permisos." };
      }
    } else if (session.user.role !== "admin") {
      return { ok: false, error: "Sin permisos." };
    } else {
      await requireOpsSession();
    }

    await prisma.availabilityBlock.delete({ where: { id: blockId } });
    revalidateAvailabilityPaths(block.unitId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof OpsAccessError ? e.message : "Error al eliminar bloque." };
  }
}

function revalidateAvailabilityPaths(unitId: string) {
  revalidatePath(`/admin/operaciones/inventory/${unitId}/disponibilidad`);
  revalidatePath(`/provider/inventario/${unitId}/disponibilidad`);
  revalidatePath(`/explorar/${unitId}`);
}

export type CalendarBlock = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  state: SlotState;
  source: "availability" | "reservation";
  label?: string;
};

export async function getUnitCalendar(unitId: string): Promise<CalendarBlock[]> {
  const [availBlocks, reservations] = await Promise.all([
    prisma.availabilityBlock.findMany({
      where: { unitId },
      orderBy: { startsAt: "asc" },
    }),
    prisma.reservation.findMany({
      where: {
        inventoryUnitId: unitId,
        status: { in: ["pending_provider", "accepted", "payment_pending", "confirmed"] },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const blocks: CalendarBlock[] = [
    ...availBlocks.map((b) => ({
      id: b.id,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      state: b.state,
      source: "availability" as const,
    })),
    ...reservations.map((r) => ({
      id: r.id,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      state: SlotState.reserved_confirmed,
      source: "reservation" as const,
      label:
        r.status === "pending_provider"
          ? "En revisión"
          : r.status === "accepted"
            ? "Aceptada"
            : "Confirmada",
    })),
  ];

  return blocks.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
