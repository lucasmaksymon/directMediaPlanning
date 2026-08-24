"use server";

import { PaymentStatus, PoPStatus, PublicationOrderStatus, ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computePlatformFee, getPlatformFeeRate } from "@/lib/platform-fee";
import { createMercadoPagoPreference, isMercadoPagoConfigured } from "@/lib/mercadopago";

export async function initiatePayment(reservationId: string): Promise<{
  ok: boolean;
  error?: string;
  checkoutUrl?: string;
  manualMode?: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "No autenticado." };

  const resv = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      advertiserId: session.user.id,
      status: { in: [ReservationStatus.accepted, ReservationStatus.payment_pending] },
    },
    include: {
      inventoryUnit: { select: { name: true } },
      payment: true,
    },
  });
  if (!resv) return { ok: false, error: "Reserva no encontrada o no está lista para pago." };

  const amount = Number(resv.agreedAmount ?? 0);
  if (amount <= 0) return { ok: false, error: "Monto inválido." };

  const rate = resv.platformFeeRate ?? (await getPlatformFeeRate());
  const { platformFee, providerAmount } = computePlatformFee(amount, rate);

  const payment =
    resv.payment ??
    (await prisma.payment.create({
      data: {
        reservationId: resv.id,
        amount,
        platformFee,
        providerAmount,
        status: PaymentStatus.pending,
      },
    }));

  if (!isMercadoPagoConfigured()) {
    await prisma.reservation.update({
      where: { id: resv.id },
      data: { status: ReservationStatus.payment_pending },
    });
    revalidatePath("/advertiser");
    return { ok: true, manualMode: true };
  }

  const pref = await createMercadoPagoPreference({
    reservationId: resv.id,
    payerEmail: session.user.email ?? undefined,
    items: [
      {
        title: `Reserva: ${resv.inventoryUnit.name}`,
        quantity: 1,
        unit_price: amount,
      },
    ],
  });

  if (!pref) return { ok: false, error: "No se pudo crear el checkout de Mercado Pago." };

  await prisma.payment.update({
    where: { id: payment.id },
    data: { mercadoPagoPreferenceId: pref.preferenceId },
  });
  await prisma.reservation.update({
    where: { id: resv.id },
    data: { status: ReservationStatus.payment_pending },
  });

  revalidatePath("/advertiser");
  return { ok: true, checkoutUrl: pref.initPoint };
}

export async function confirmPaymentManual(reservationId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { ok: false, error: "Solo administradores pueden confirmar pagos manuales." };
  }

  const payment = await prisma.payment.findUnique({
    where: { reservationId },
    include: { reservation: true },
  });
  if (!payment) return { ok: false, error: "Pago no encontrado." };

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.approved, paidAt: new Date() },
    }),
    prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.confirmed },
    }),
  ]);

  revalidatePath("/admin/reservas");
  revalidatePath("/advertiser");
  return { ok: true };
}

export async function markPaymentApproved(reservationId: string, mercadoPagoPaymentId?: string) {
  const payment = await prisma.payment.findUnique({ where: { reservationId } });
  if (!payment) return;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.approved,
        paidAt: new Date(),
        ...(mercadoPagoPaymentId ? { mercadoPagoPaymentId } : {}),
      },
    }),
    prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.confirmed },
    }),
    prisma.proofOfPlay.upsert({
      where: { reservationId },
      create: { reservationId, status: PoPStatus.pending },
      update: {},
    }),
    prisma.publicationOrder.upsert({
      where: { reservationId },
      create: { reservationId, status: PublicationOrderStatus.draft },
      update: {},
    }),
  ]);

  revalidatePath("/advertiser");
  revalidatePath("/admin/reservas");
}
