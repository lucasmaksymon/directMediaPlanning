"use server";

import { InventoryFormat, InventoryStatus, PriceModel, ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { APP_URL } from "@/lib/email";
import { assertProviderScreenLimit } from "@/lib/freemium";

class ProviderAccessError extends Error {}

/** Verifica que la sesión sea de proveedor y devuelve el perfil. */
async function requireProviderSession() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "provider" && session.user.role !== "admin")) {
    throw new ProviderAccessError("Acceso denegado.");
  }
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile && session.user.role === "provider") {
    throw new ProviderAccessError("No encontramos tu perfil de proveedor. Contactá a soporte.");
  }
  return { session, profile };
}

/* ─── Inventario ─── */

export type InventoryUpsertState = { error?: string; ok?: boolean } | undefined;

export async function createProviderInventoryUnit(
  _prev: InventoryUpsertState,
  formData: FormData,
): Promise<InventoryUpsertState> {
  try {
    const { profile } = await requireProviderSession();
    if (!profile) return { error: "Perfil de proveedor no encontrado." };

    const name = String(formData.get("name") ?? "").trim();
    const locationLabel = String(formData.get("locationLabel") ?? "").trim();
    const format = String(formData.get("format") ?? "") as InventoryFormat;
    const basePriceAmount = Number(formData.get("basePriceAmount") ?? 0);
    const agencyPriceAmount = formData.get("agencyPriceAmount")
      ? Number(formData.get("agencyPriceAmount"))
      : null;
    const description = String(formData.get("description") ?? "").trim() || undefined;
    const latRaw = formData.get("latitude");
    const lngRaw = formData.get("longitude");
    const latitude = latRaw ? Number(latRaw) : null;
    const longitude = lngRaw ? Number(lngRaw) : null;
    const instantBookEnabled = formData.get("instantBookEnabled") === "on";
    const lastMinuteEnabled = formData.get("lastMinuteEnabled") === "on";
    const lastMinuteDiscountPercent = Number(formData.get("lastMinuteDiscountPercent") ?? 20);

    if (!name) return { error: "El nombre es obligatorio." };
    if (!locationLabel) return { error: "La ubicación es obligatoria." };
    if (!Object.values(InventoryFormat).includes(format)) return { error: "Formato inválido." };
    if (basePriceAmount <= 0) return { error: "El precio directo debe ser mayor a cero." };
    if (agencyPriceAmount !== null && agencyPriceAmount >= basePriceAmount) {
      return { error: "El precio para agencias debe ser menor al precio directo." };
    }

    const limit = await assertProviderScreenLimit(profile.id);
    if (!limit.ok) return { error: limit.error };

    await prisma.inventoryUnit.create({
      data: {
        providerId: profile.id,
        name,
        locationLabel,
        format,
        basePriceAmount,
        agencyPriceAmount,
        description,
        latitude,
        longitude,
        priceModel: PriceModel.fixed_list,
        status: InventoryStatus.draft,
        instantBookEnabled,
        lastMinuteEnabled,
        lastMinuteDiscountPercent,
      },
    });

    revalidatePath("/provider/inventario");
    revalidatePath("/explorar");
    return { ok: true };
  } catch (e) {
    if (e instanceof ProviderAccessError) return { error: e.message };
    return { error: "Error al crear el espacio. Intentá de nuevo." };
  }
}

export async function updateProviderInventoryUnit(
  unitId: string,
  _prev: InventoryUpsertState,
  formData: FormData,
): Promise<InventoryUpsertState> {
  try {
    const { profile } = await requireProviderSession();
    if (!profile) return { error: "Perfil de proveedor no encontrado." };

    const unit = await prisma.inventoryUnit.findFirst({
      where: { id: unitId, providerId: profile.id },
    });
    if (!unit) return { error: "Espacio no encontrado." };

    const name = String(formData.get("name") ?? "").trim();
    const locationLabel = String(formData.get("locationLabel") ?? "").trim();
    const format = String(formData.get("format") ?? "") as InventoryFormat;
    const basePriceAmount = Number(formData.get("basePriceAmount") ?? 0);
    const agencyPriceAmount = formData.get("agencyPriceAmount")
      ? Number(formData.get("agencyPriceAmount"))
      : null;
    const description = String(formData.get("description") ?? "").trim() || undefined;
    const latRaw = formData.get("latitude");
    const lngRaw = formData.get("longitude");
    const latitude = latRaw ? Number(latRaw) : null;
    const longitude = lngRaw ? Number(lngRaw) : null;
    const instantBookEnabled = formData.get("instantBookEnabled") === "on";
    const lastMinuteEnabled = formData.get("lastMinuteEnabled") === "on";
    const lastMinuteDiscountPercent = Number(formData.get("lastMinuteDiscountPercent") ?? 20);

    if (!name) return { error: "El nombre es obligatorio." };
    if (!locationLabel) return { error: "La ubicación es obligatoria." };
    if (!Object.values(InventoryFormat).includes(format)) return { error: "Formato inválido." };
    if (basePriceAmount <= 0) return { error: "El precio directo debe ser mayor a cero." };
    if (agencyPriceAmount !== null && agencyPriceAmount >= basePriceAmount) {
      return { error: "El precio para agencias debe ser menor al precio directo." };
    }

    await prisma.inventoryUnit.update({
      where: { id: unitId },
      data: {
        name,
        locationLabel,
        format,
        basePriceAmount,
        agencyPriceAmount,
        description,
        latitude,
        longitude,
        instantBookEnabled,
        lastMinuteEnabled,
        lastMinuteDiscountPercent,
      },
    });

    revalidatePath("/provider/inventario");
    revalidatePath(`/provider/inventario/${unitId}/editar`);
    revalidatePath("/explorar");
    revalidatePath(`/explorar/${unitId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof ProviderAccessError) return { error: e.message };
    return { error: "Error al actualizar el espacio." };
  }
}

export async function updateProviderInventoryStatus(
  unitId: string,
  status: InventoryStatus,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { profile } = await requireProviderSession();
    if (!profile) return { ok: false, error: "Perfil no encontrado." };

    const unit = await prisma.inventoryUnit.findFirst({
      where: { id: unitId, providerId: profile.id },
    });
    if (!unit) return { ok: false, error: "Espacio no encontrado." };

    await prisma.inventoryUnit.update({ where: { id: unitId }, data: { status } });
    revalidatePath("/provider/inventario");
    revalidatePath("/explorar");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar." };
  }
}

export async function deleteProviderInventoryUnit(
  unitId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { profile } = await requireProviderSession();
    if (!profile) return { ok: false, error: "Perfil no encontrado." };

    const unit = await prisma.inventoryUnit.findFirst({
      where: { id: unitId, providerId: profile.id },
    });
    if (!unit) return { ok: false, error: "Espacio no encontrado." };

    await prisma.inventoryUnit.delete({ where: { id: unitId } });
    revalidatePath("/provider/inventario");
    revalidatePath("/explorar");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al eliminar." };
  }
}

/* ─── Reservas ─── */

export async function providerAcceptReservation(
  reservationId: string,
  providerNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { profile } = await requireProviderSession();
    if (!profile) return { ok: false, error: "Perfil no encontrado." };

    const resv = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        status: ReservationStatus.pending_provider,
        inventoryUnit: { providerId: profile.id },
      },
      include: { inventoryUnit: true, advertiser: { select: { email: true } } },
    });
    if (!resv) return { ok: false, error: "Solicitud no encontrada o ya respondida." };

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.accepted,
        agreedAmount: resv.agreedAmount ?? resv.inventoryUnit.basePriceAmount,
        providerNote: providerNote ?? null,
      },
    });

    // Notificar al anunciante
    sendEmail({
      type: "reservation_accepted",
      to: resv.advertiser.email ?? "",
      unitName: resv.inventoryUnit.name,
      providerName: profile.companyName,
      startsAt: resv.startsAt,
      endsAt: resv.endsAt,
      note: providerNote,
    }).catch(() => {});

    revalidatePath("/provider/reservas");
    revalidatePath("/advertiser");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al aceptar la solicitud." };
  }
}

export async function providerRejectReservation(
  reservationId: string,
  providerNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { profile } = await requireProviderSession();
    if (!profile) return { ok: false, error: "Perfil no encontrado." };

    const resv = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        status: ReservationStatus.pending_provider,
        inventoryUnit: { providerId: profile.id },
      },
    });
    if (!resv) return { ok: false, error: "Solicitud no encontrada o ya respondida." };

    const resvWithUnit = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        inventoryUnit: { select: { name: true } },
        advertiser: { select: { email: true } },
      },
    });

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.rejected,
        providerNote: providerNote ?? null,
      },
    });

    // Notificar al anunciante
    if (resvWithUnit?.advertiser.email) {
      sendEmail({
        type: "reservation_rejected",
        to: resvWithUnit.advertiser.email,
        unitName: resvWithUnit.inventoryUnit.name,
        providerName: profile.companyName,
        note: providerNote,
      }).catch(() => {});
    }

    revalidatePath("/provider/reservas");
    revalidatePath("/advertiser");
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al rechazar la solicitud." };
  }
}

/** Envía alertas de Last Minute a todos los anunciantes (llamar desde cron o admin). */
export async function sendLastMinuteAlerts(): Promise<{ sent: number }> {
  const windowDays = 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + windowDays);

  const lastMinuteUnits = await prisma.inventoryUnit.findMany({
    where: {
      status: "published",
      lastMinuteEnabled: true,
      // Sin reservas activas en los próximos 7 días
      NOT: {
        reservations: {
          some: {
            status: { in: [ReservationStatus.pending_provider, ReservationStatus.accepted, ReservationStatus.confirmed] },
            startsAt: { lte: cutoff },
            endsAt: { gte: new Date() },
          },
        },
      },
    },
  });

  if (lastMinuteUnits.length === 0) return { sent: 0 };

  const advertisers = await prisma.user.findMany({
    where: { role: "advertiser" },
    select: { email: true },
  });

  let sent = 0;
  for (const unit of lastMinuteUnits.slice(0, 3)) {
    for (const advertiser of advertisers.slice(0, 50)) {
      sendEmail({
        type: "last_minute_alert",
        to: advertiser.email,
        unitName: unit.name,
        locationLabel: unit.locationLabel,
        discountPct: unit.lastMinuteDiscountPercent,
        unitUrl: `${APP_URL}/explorar/${unit.id}`,
      }).catch(() => {});
      sent++;
    }
  }

  return { sent };
}
