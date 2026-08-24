"use server";

import { PriceType, ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computePlatformFee, getPlatformFeeRate } from "@/lib/platform-fee";

export type CircuitReservationState = { error?: string; ok?: boolean; created?: number } | undefined;

export async function createCircuitReservation(
  circuitId: string,
  _prev: CircuitReservationState,
  formData: FormData,
): Promise<CircuitReservationState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "advertiser") {
    return { error: "Iniciá sesión como anunciante." };
  }

  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsAtRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(endsAtRaw)) {
    return { error: "Ingresá fechas válidas." };
  }

  const startsAt = new Date(`${startsAtRaw}T00:00:00.000Z`);
  const endsAt = new Date(`${endsAtRaw}T23:59:59.999Z`);
  if (endsAt < startsAt) return { error: "La fecha de fin debe ser posterior al inicio." };

  const circuit = await prisma.circuit.findFirst({
    where: { id: circuitId, isPublished: true },
    include: {
      units: { include: { unit: true } },
    },
  });
  if (!circuit || circuit.units.length === 0) {
    return { error: "Circuito no disponible." };
  }

  const platformFeeRate = await getPlatformFeeRate();
  let created = 0;

  for (const cu of circuit.units) {
    const unit = cu.unit;
    if (unit.status !== "published") continue;

    const overlap = await prisma.reservation.findFirst({
      where: {
        inventoryUnitId: unit.id,
        status: {
          in: [
            ReservationStatus.pending_provider,
            ReservationStatus.accepted,
            ReservationStatus.payment_pending,
            ReservationStatus.confirmed,
          ],
        },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (overlap) continue;

    const agreedAmount = circuit.totalPrice
      ? Number(circuit.totalPrice) / circuit.units.length
      : Number(unit.basePriceAmount);
    const { platformFee } = computePlatformFee(agreedAmount, platformFeeRate);

    await prisma.reservation.create({
      data: {
        inventoryUnitId: unit.id,
        circuitId: circuit.id,
        advertiserId: session.user.id,
        startsAt,
        endsAt,
        status: ReservationStatus.pending_provider,
        agreedAmount,
        platformFeeRate,
        platformFeeAmount: platformFee,
        priceType: PriceType.direct,
        campaignId,
      },
    });
    created++;
  }

  if (created === 0) {
    return { error: "No se pudo reservar ningún espacio del circuito (fechas ocupadas o sin stock)." };
  }

  revalidatePath("/explorar/circuitos");
  revalidatePath("/advertiser");
  return { ok: true, created };
}
