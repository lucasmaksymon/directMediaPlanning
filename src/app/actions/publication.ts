"use server";

import { PublicationOrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function sendPublicationOrder(
  reservationId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "advertiser") {
    return { ok: false, error: "Debés iniciar sesión como anunciante." };
  }

  const creativeAssetIds = formData.getAll("creativeAssetIds").map(String);
  const instructions = String(formData.get("instructions") ?? "").trim() || undefined;

  const resv = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      advertiserId: session.user.id,
      status: { in: ["accepted", "payment_pending", "confirmed"] },
    },
    include: {
      inventoryUnit: {
        include: { provider: { include: { user: { select: { email: true } } } } },
      },
    },
  });
  if (!resv) return { ok: false, error: "Reserva no encontrada o no está confirmada." };

  await prisma.publicationOrder.upsert({
    where: { reservationId },
    create: {
      reservationId,
      campaignId: resv.campaignId,
      creativeAssetIds,
      instructions,
      status: PublicationOrderStatus.sent,
      sentAt: new Date(),
    },
    update: {
      creativeAssetIds,
      instructions,
      status: PublicationOrderStatus.sent,
      sentAt: new Date(),
    },
  });

  const providerEmail = resv.inventoryUnit.provider.user?.email;
  if (providerEmail) {
    sendEmail({
      type: "new_reservation",
      to: providerEmail,
      providerName: resv.inventoryUnit.provider.companyName,
      unitName: resv.inventoryUnit.name,
      advertiserEmail: session.user.email ?? "",
      startsAt: resv.startsAt,
      endsAt: resv.endsAt,
      reservationId,
    }).catch(() => {});
  }

  revalidatePath("/advertiser");
  revalidatePath("/provider/reservas");
  return { ok: true };
}

export async function updatePublicationOrderStatus(
  reservationId: string,
  status: PublicationOrderStatus,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "No autenticado." };

  const order = await prisma.publicationOrder.findFirst({
    where: { reservationId },
    include: {
      reservation: {
        include: { inventoryUnit: { select: { providerId: true, provider: { select: { userId: true } } } } },
      },
    },
  });
  if (!order) return { ok: false, error: "Orden no encontrada." };

  const isProvider =
    session.user.role === "provider" &&
    order.reservation.inventoryUnit.provider.userId === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isProvider && !isAdmin) return { ok: false, error: "Sin permisos." };

  await prisma.publicationOrder.update({
    where: { reservationId },
    data: { status },
  });

  revalidatePath("/provider/reservas");
  return { ok: true };
}
