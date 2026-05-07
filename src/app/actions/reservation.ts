"use server";

import { ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type ReservationState = { error?: string; ok?: boolean } | undefined;

export async function createReservation(
  inventoryUnitId: string,
  _prev: ReservationState,
  formData: FormData,
): Promise<ReservationState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "advertiser") {
    return { error: "Iniciá sesión con una cuenta de anunciante para enviar una solicitud." };
  }

  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsAtRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(endsAtRaw)) {
    return { error: "Ingresá fechas válidas en ambos campos." };
  }
  const startsAt = new Date(`${startsAtRaw}T00:00:00.000Z`);
  const endsAt = new Date(`${endsAtRaw}T23:59:59.999Z`);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Ingresá fechas válidas en ambos campos." };
  }
  if (endsAt < startsAt) {
    return { error: "La fecha de fin debe ser igual o posterior a la de inicio." };
  }

  const unit = await prisma.inventoryUnit.findFirst({
    where: { id: inventoryUnitId, status: "published" },
  });
  if (!unit) {
    return { error: "Este espacio no está disponible para solicitudes en este momento." };
  }

  const overlap = await prisma.reservation.findFirst({
    where: {
      inventoryUnitId,
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

  if (overlap) {
    return { error: "Ya hay una solicitud pendiente o confirmada en ese rango. Elegí otras fechas." };
  }

  await prisma.reservation.create({
    data: {
      inventoryUnitId,
      advertiserId: session.user.id,
      startsAt,
      endsAt,
      status: ReservationStatus.pending_provider,
      agreedAmount: unit.basePriceAmount,
    },
  });

  revalidatePath("/explorar");
  revalidatePath(`/explorar/${inventoryUnitId}`);
  revalidatePath("/advertiser");
  return { ok: true };
}

export type BatchReservationResult = { ok: true; created: number } | { ok: false; error: string };

export async function createBatchReservations(
  unitIds: string[],
  fechaInicio: string,
  fechaFin: string,
): Promise<BatchReservationResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "advertiser") {
    return { ok: false, error: "Debés iniciar sesión como anunciante." };
  }
  if (!Array.isArray(unitIds) || unitIds.length === 0) {
    return { ok: false, error: "No hay espacios seleccionados." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
    return { ok: false, error: "Fechas inválidas." };
  }

  const startsAt = new Date(`${fechaInicio}T00:00:00.000Z`);
  const endsAt = new Date(`${fechaFin}T23:59:59.999Z`);
  if (endsAt < startsAt) return { ok: false, error: "La fecha de fin debe ser posterior al inicio." };

  let created = 0;
  for (const unitId of unitIds) {
    const unit = await prisma.inventoryUnit.findFirst({ where: { id: unitId, status: "published" } });
    if (!unit) continue;

    const overlap = await prisma.reservation.findFirst({
      where: {
        inventoryUnitId: unitId,
        status: { in: [ReservationStatus.pending_provider, ReservationStatus.accepted, ReservationStatus.payment_pending, ReservationStatus.confirmed] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (overlap) continue;

    await prisma.reservation.create({
      data: {
        inventoryUnitId: unitId,
        advertiserId: session.user.id,
        startsAt,
        endsAt,
        status: ReservationStatus.pending_provider,
        agreedAmount: unit.basePriceAmount,
      },
    });
    created++;
  }

  revalidatePath("/advertiser");
  revalidatePath("/explorar");
  return { ok: true, created };
}

export async function acceptReservationFromForm(formData: FormData): Promise<void> {
  const reservationId = String(formData.get("reservationId") ?? "");
  const providerNote = String(formData.get("providerNote") ?? "").trim() || undefined;
  if (!reservationId) return;
  await acceptReservation(reservationId, providerNote);
}

export async function rejectReservationFromForm(formData: FormData): Promise<void> {
  const reservationId = String(formData.get("reservationId") ?? "");
  const providerNote = String(formData.get("providerNote") ?? "").trim() || undefined;
  if (!reservationId) return;
  await rejectReservation(reservationId, providerNote);
}

export async function acceptReservation(reservationId: string, providerNote?: string): Promise<ReservationState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "provider") {
    return { error: "No tenés permiso para esta acción." };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "No encontramos el perfil de tu medio." };

  const resv = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      status: ReservationStatus.pending_provider,
      inventoryUnit: { providerId: profile.id },
    },
    include: { inventoryUnit: true },
  });
  if (!resv) return { error: "Esa solicitud no existe o ya fue respondida." };

  await prisma.reservation.update({
    where: { id: resv.id },
    data: {
      status: ReservationStatus.accepted,
      agreedAmount: resv.agreedAmount ?? resv.inventoryUnit.basePriceAmount,
      ...(providerNote ? { providerNote } : {}),
    },
  });

  revalidatePath("/provider/reservations");
  revalidatePath("/advertiser");
  return { ok: true };
}

export async function rejectReservation(reservationId: string, providerNote?: string): Promise<ReservationState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "provider") {
    return { error: "No tenés permiso para esta acción." };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return { error: "No encontramos el perfil de tu medio." };

  const resv = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      status: ReservationStatus.pending_provider,
      inventoryUnit: { providerId: profile.id },
    },
  });
  if (!resv) return { error: "Esa solicitud no existe o ya fue respondida." };

  await prisma.reservation.update({
    where: { id: resv.id },
    data: {
      status: ReservationStatus.rejected,
      ...(providerNote ? { providerNote } : {}),
    },
  });

  revalidatePath("/provider/reservations");
  revalidatePath("/advertiser");
  return { ok: true };
}
