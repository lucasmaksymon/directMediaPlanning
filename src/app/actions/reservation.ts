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
import {
  blockedAvailabilityWhere,
  holdExpiresAt,
  reservationOverlapWhere,
} from "@/lib/availability";
import { generateReservationShortCode } from "@/lib/reservation-code";
import { logReservationEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

export type ReservationState = { error?: string; ok?: boolean; instantBook?: boolean } | undefined;

async function allocateShortCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateReservationShortCode();
    const existing = await prisma.reservation.findUnique({ where: { shortCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  return generateReservationShortCode(8);
}

async function assertSlotFree(inventoryUnitId: string, startsAt: Date, endsAt: Date) {
  const [overlap, blocked] = await Promise.all([
    prisma.reservation.findFirst({ where: reservationOverlapWhere(inventoryUnitId, startsAt, endsAt) }),
    prisma.availabilityBlock.findFirst({ where: blockedAvailabilityWhere(inventoryUnitId, startsAt, endsAt) }),
  ]);
  if (overlap || blocked) {
    return { error: "Ya hay una solicitud, reserva o bloqueo en ese rango. Elegí otras fechas." };
  }
  return null;
}

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

  const busy = await assertSlotFree(inventoryUnitId, startsAt, endsAt);
  if (busy) return busy;

  const durationDays = Math.ceil((endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24));
  const instantBookApplies =
    unit.instantBookEnabled && durationDays >= (unit.instantBookMinDays ?? 1);
  const reservationStatus = instantBookApplies ? ReservationStatus.hold : ReservationStatus.pending_provider;

  let agreedAmount = unit.basePriceAmount;
  let commissionAmount: number | null = null;

  if (priceType === PriceType.agency && agencyIdRaw && unit.agencyPriceAmount) {
    const agencyLink = await prisma.agencyClient.findFirst({
      where: { agencyId: agencyIdRaw, advertiserId: session.user.id },
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

  const shortCode = await allocateShortCode();
  const created = await prisma.reservation.create({
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
      shortCode,
      holdExpiresAt: instantBookApplies ? holdExpiresAt() : undefined,
    },
  });

  await logReservationEvent({
    reservationId: created.id,
    action: instantBookApplies ? "created_hold" : "created",
    actorUserId: session.user.id,
    toStatus: reservationStatus,
  });

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
      note: "Retención automática (Libro Instantáneo). Completá el pago antes de que venza.",
    }).catch((e) => logger.error("email_failed", { type: "reservation_accepted", error: String(e) }));
  } else {
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
        }).catch((e) => logger.error("email_failed", { type: "new_reservation_provider", error: String(e) }));
      }
    }

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { email: true },
    });
    const adminEmails = admins.map((a) => a.email).filter(Boolean);
    if (adminEmails[0]) {
      sendEmail({
        type: "new_reservation",
        to: adminEmails[0],
        bcc: adminEmails.slice(1),
        providerName: unit.provider.companyName,
        unitName: unit.name,
        advertiserEmail: session.user.email ?? "",
        startsAt,
        endsAt,
        reservationId: created.id,
      }).catch((e) => logger.error("email_failed", { type: "new_reservation", error: String(e) }));
    }
    const notifyPhone = process.env.ADMIN_NOTIFY_WHATSAPP;
    if (notifyPhone) {
      sendWhatsApp(
        notifyPhone,
        buildNewReservationWhatsApp(unit.name, session.user.email ?? "", startsAt, endsAt, shortCode),
      ).catch((e) => logger.error("whatsapp_failed", { error: String(e) }));
    }
  }

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
        reservationId: created.id,
      }).catch((e) => logger.error("email_failed", { type: "new_reservation_agency", error: String(e) }));
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
    const busy = await assertSlotFree(unitId, startsAt, endsAt);
    if (busy) continue;

    const shortCode = await allocateShortCode();
    const resv = await prisma.reservation.create({
      data: {
        inventoryUnitId: unitId,
        advertiserId: session.user.id,
        startsAt,
        endsAt,
        status: ReservationStatus.pending_provider,
        agreedAmount: unit.basePriceAmount,
        shortCode,
      },
    });
    await logReservationEvent({
      reservationId: resv.id,
      action: "created_batch",
      actorUserId: session.user.id,
      toStatus: ReservationStatus.pending_provider,
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

export async function decideReservationById(
  reservationId: string,
  action: "accept" | "reject",
  opts?: { providerNote?: string; actorUserId?: string | null; skipAuth?: boolean },
): Promise<ReservationState> {
  if (!opts?.skipAuth) {
    try {
      await requireOpsSession();
    } catch {
      return { error: "No tenés permiso para esta acción." };
    }
  }

  const resv = await prisma.reservation.findFirst({
    where: { id: reservationId, status: ReservationStatus.pending_provider },
    include: { inventoryUnit: true },
  });
  if (!resv) return { error: "Esa solicitud no existe o ya fue respondida." };

  const toStatus = action === "accept" ? ReservationStatus.accepted : ReservationStatus.rejected;
  await prisma.reservation.update({
    where: { id: resv.id },
    data: {
      status: toStatus,
      agreedAmount: action === "accept" ? (resv.agreedAmount ?? resv.inventoryUnit.basePriceAmount) : resv.agreedAmount,
      ...(opts?.providerNote ? { providerNote: opts.providerNote } : {}),
    },
  });

  await logReservationEvent({
    reservationId: resv.id,
    action: action === "accept" ? "accepted" : "rejected",
    actorUserId: opts?.actorUserId,
    fromStatus: ReservationStatus.pending_provider,
    toStatus,
    note: opts?.providerNote,
  });

  const advertiserUser = await prisma.user.findUnique({
    where: { id: resv.advertiserId },
    select: { email: true },
  });
  if (advertiserUser) {
    sendEmail(
      action === "accept"
        ? {
            type: "reservation_accepted",
            to: advertiserUser.email,
            unitName: resv.inventoryUnit.name,
            providerName: CLIENT_BRAND,
            startsAt: resv.startsAt,
            endsAt: resv.endsAt,
            note: opts?.providerNote,
          }
        : {
            type: "reservation_rejected",
            to: advertiserUser.email,
            unitName: resv.inventoryUnit.name,
            providerName: CLIENT_BRAND,
            note: opts?.providerNote,
          },
    ).catch((e) => logger.error("email_failed", { type: action, error: String(e) }));
  }

  revalidatePath("/admin/reservas");
  revalidatePath("/advertiser");
  return { ok: true };
}

export async function acceptReservation(reservationId: string, providerNote?: string): Promise<ReservationState> {
  const session = await auth();
  return decideReservationById(reservationId, "accept", {
    providerNote,
    actorUserId: session?.user?.id,
  });
}

export async function rejectReservation(reservationId: string, providerNote?: string): Promise<ReservationState> {
  const session = await auth();
  return decideReservationById(reservationId, "reject", {
    providerNote,
    actorUserId: session?.user?.id,
  });
}

export async function releaseExpiredHolds(): Promise<{ released: number }> {
  const now = new Date();
  const expired = await prisma.reservation.findMany({
    where: {
      status: { in: [ReservationStatus.hold, ReservationStatus.payment_pending] },
      holdExpiresAt: { lte: now },
    },
    select: { id: true, status: true },
  });
  if (expired.length === 0) return { released: 0 };

  await prisma.reservation.updateMany({
    where: { id: { in: expired.map((r) => r.id) } },
    data: { status: ReservationStatus.cancelled },
  });
  for (const r of expired) {
    await logReservationEvent({
      reservationId: r.id,
      action: "hold_expired",
      fromStatus: r.status,
      toStatus: ReservationStatus.cancelled,
    });
  }
  revalidatePath("/explorar");
  revalidatePath("/advertiser");
  return { released: expired.length };
}
