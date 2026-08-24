"use server";

import { PriceType, ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLIENT_BRAND } from "@/lib/brand";
import { sendEmail } from "@/lib/email";
import { computePlatformFee, getPlatformFeeRate } from "@/lib/platform-fee";
import { requireOpsSession } from "@/lib/ops-access";
import { sendWhatsApp, buildNewReservationWhatsApp } from "@/lib/whatsapp";

export type ReservationState = { error?: string; ok?: boolean; instantBook?: boolean } | undefined;

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
  const priceTypeRaw = String(formData.get("priceType") ?? "direct");
  const agencyIdRaw = String(formData.get("agencyId") ?? "").trim() || null;
  const campaignIdRaw = String(formData.get("campaignId") ?? "").trim() || null;
  const priceType: PriceType = priceTypeRaw === "agency" ? PriceType.agency : PriceType.direct;

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

  const advertiserExists = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!advertiserExists) {
    return { error: "Tu sesión está desactualizada. Por favor, cerrá sesión y volvé a ingresar." };
  }

  const unit = await prisma.inventoryUnit.findFirst({
    where: { id: inventoryUnitId, status: "published" },
    include: { provider: { select: { userId: true, companyName: true, phone: true } } },
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

  // Determinar si aplica Instant Book
  const durationDays = Math.ceil((endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24));
  const instantBookApplies =
    unit.instantBookEnabled &&
    durationDays >= (unit.instantBookMinDays ?? 1);
  const reservationStatus = instantBookApplies ? ReservationStatus.accepted : ReservationStatus.pending_provider;

  // Calcular precio y comisión según tipo de reserva
  let agreedAmount = unit.basePriceAmount;
  let commissionAmount: number | null = null;

  if (priceType === PriceType.agency && agencyIdRaw && unit.agencyPriceAmount) {
    // Verificar que la agencia existe y el anunciante es cliente
    const agencyLink = await prisma.agencyClient.findFirst({
      where: { agencyId: agencyIdRaw, advertiserId: session.user.id },
      include: { agency: { select: { commissionPct: true } } },
    });
    if (agencyLink) {
      agreedAmount = unit.agencyPriceAmount;
      commissionAmount = Number(unit.basePriceAmount) - Number(unit.agencyPriceAmount);
    }
  }

  const platformFeeRate = await getPlatformFeeRate();
  const { platformFee } = computePlatformFee(Number(agreedAmount), platformFeeRate);

  if (campaignIdRaw) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignIdRaw, advertiserId: session.user.id },
    });
    if (!campaign) return { error: "Campaña no encontrada." };
  }

  await prisma.reservation.create({
    data: {
      inventoryUnitId,
      advertiserId: session.user.id,
      startsAt,
      endsAt,
      status: reservationStatus,
      agreedAmount,
      platformFeeRate,
      platformFeeAmount: platformFee,
      priceType,
      agencyId: priceType === PriceType.agency ? agencyIdRaw : null,
      commissionAmount: commissionAmount !== null ? commissionAmount : undefined,
      campaignId: campaignIdRaw,
    },
  });

  // Obtener nombre del anunciante y agencia (si aplica)
  const advertiserProfile = await prisma.advertiserProfile.findUnique({
    where: { userId: session.user.id },
    select: { legalName: true },
  });
  const advertiserName = advertiserProfile?.legalName ?? session.user.email ?? "Anunciante";

  let agencyName: string | undefined;
  if (priceType === PriceType.agency && agencyIdRaw) {
    const agency = await prisma.agencyProfile.findUnique({
      where: { id: agencyIdRaw },
      select: { companyName: true },
    });
    agencyName = agency?.companyName;
  }

  if (instantBookApplies) {
    sendEmail({
      type: "reservation_accepted",
      to: session.user.email ?? "",
      unitName: unit.name,
      providerName: CLIENT_BRAND,
      startsAt,
      endsAt,
      note: "Confirmación automática mediante Libro Instantáneo.",
    }).catch(() => {});
  } else {
    // Notificar al proveedor si tiene usuario registrado
    if (unit.provider.userId) {
      const providerUser = await prisma.user.findUnique({
        where: { id: unit.provider.userId },
        select: { email: true },
      });
      if (providerUser?.email) {
        sendEmail({
          type: "new_reservation_provider",
          to: providerUser.email,
          unitName: unit.name,
          advertiserName,
          agencyName,
          startsAt,
          endsAt,
          providerPanelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/provider/reservas`,
        }).catch(() => {});
      }
    }

    // Notificar a admins también
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { email: true },
    });
    for (const admin of admins) {
      sendEmail({
        type: "new_reservation",
        to: admin.email,
        providerName: unit.provider.companyName,
        unitName: unit.name,
        advertiserEmail: session.user.email ?? "",
        startsAt,
        endsAt,
        reservationId: inventoryUnitId,
      }).catch(() => {});
    }
    const notifyPhone = process.env.ADMIN_NOTIFY_WHATSAPP;
    if (notifyPhone) {
      sendWhatsApp(
        notifyPhone,
        buildNewReservationWhatsApp(unit.name, session.user.email ?? "", startsAt, endsAt, inventoryUnitId),
      ).catch(() => {});
    }
  }

  // Notificar a la agencia si la reserva es vía agencia
  if (priceType === PriceType.agency && agencyIdRaw) {
    const agencyUser = await prisma.agencyProfile.findUnique({
      where: { id: agencyIdRaw },
      include: { user: { select: { email: true } } },
    });
    if (agencyUser?.user?.email) {
      sendEmail({
        type: "new_reservation",
        to: agencyUser.user.email,
        providerName: unit.provider.companyName,
        unitName: unit.name,
        advertiserEmail: advertiserName,
        startsAt,
        endsAt,
        reservationId: inventoryUnitId,
      }).catch(() => {});
    }
  }

  revalidatePath("/explorar");
  revalidatePath(`/explorar/${inventoryUnitId}`);
  revalidatePath("/advertiser");
  return { ok: true, instantBook: instantBookApplies };
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

  const advertiserExists = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!advertiserExists) {
    return { ok: false, error: "Tu sesión está desactualizada. Por favor, cerrá sesión y volvé a ingresar." };
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
  try {
    await requireOpsSession();

    const resv = await prisma.reservation.findFirst({
      where: { id: reservationId, status: ReservationStatus.pending_provider },
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

    const advertiserUser = await prisma.user.findUnique({
      where: { id: resv.advertiserId },
      select: { email: true },
    });
    if (advertiserUser) {
      sendEmail({
        type: "reservation_accepted",
        to: advertiserUser.email,
        unitName: resv.inventoryUnit.name,
        providerName: CLIENT_BRAND,
        startsAt: resv.startsAt,
        endsAt: resv.endsAt,
        note: providerNote,
      }).catch(() => {});
    }

    revalidatePath("/admin/reservas");
    revalidatePath("/advertiser");
    return { ok: true };
  } catch {
    return { error: "No tenés permiso para esta acción." };
  }
}

export async function rejectReservation(reservationId: string, providerNote?: string): Promise<ReservationState> {
  try {
    await requireOpsSession();

    const resv = await prisma.reservation.findFirst({
      where: { id: reservationId, status: ReservationStatus.pending_provider },
      include: { inventoryUnit: { select: { name: true } } },
    });
    if (!resv) return { error: "Esa solicitud no existe o ya fue respondida." };

    await prisma.reservation.update({
      where: { id: resv.id },
      data: {
        status: ReservationStatus.rejected,
        ...(providerNote ? { providerNote } : {}),
      },
    });

    const advertiserUser = await prisma.user.findUnique({
      where: { id: resv.advertiserId },
      select: { email: true },
    });
    if (advertiserUser) {
      sendEmail({
        type: "reservation_rejected",
        to: advertiserUser.email,
        unitName: resv.inventoryUnit.name,
        providerName: CLIENT_BRAND,
        note: providerNote,
      }).catch(() => {});
    }

    revalidatePath("/admin/reservas");
    revalidatePath("/advertiser");
    return { ok: true };
  } catch {
    return { error: "No tenés permiso para esta acción." };
  }
}
