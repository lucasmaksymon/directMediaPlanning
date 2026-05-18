"use server";

import { SlotState } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProviderProfileByUserId } from "@/lib/provider";

export type AvailabilityActionResult = { ok: boolean; error?: string };

export async function createAvailabilityBlock(
  unitId: string,
  startsAt: Date,
  endsAt: Date,
  state: SlotState = SlotState.available,
): Promise<AvailabilityActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autenticado." };

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) return { ok: false, error: "No encontramos el perfil de tu medio." };

  const unit = await prisma.inventoryUnit.findFirst({ where: { id: unitId, providerId: profile.id } });
  if (!unit) return { ok: false, error: "Unidad no encontrada o sin permiso." };

  if (endsAt <= startsAt) return { ok: false, error: "La fecha de fin debe ser posterior a la de inicio." };

  await prisma.availabilityBlock.create({
    data: { unitId, startsAt, endsAt, state },
  });

  revalidatePath(`/provider/inventory/${unitId}/disponibilidad`);
  revalidatePath(`/explorar/${unitId}`);
  return { ok: true };
}

export async function deleteAvailabilityBlock(blockId: string): Promise<AvailabilityActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autenticado." };

  const profile = await getProviderProfileByUserId(session.user.id);
  if (!profile) return { ok: false, error: "Sin perfil de proveedor." };

  const block = await prisma.availabilityBlock.findFirst({
    where: { id: blockId, unit: { providerId: profile.id } },
  });
  if (!block) return { ok: false, error: "Bloque no encontrado." };

  await prisma.availabilityBlock.delete({ where: { id: blockId } });
  revalidatePath(`/provider/inventory/${block.unitId}/disponibilidad`);
  revalidatePath(`/explorar/${block.unitId}`);
  return { ok: true };
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
      label: r.status === "pending_provider" ? "Pendiente" : r.status === "accepted" ? "Aceptada" : "Confirmada",
    })),
  ];

  return blocks.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
