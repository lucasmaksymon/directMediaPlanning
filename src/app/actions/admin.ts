"use server";

import { ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Acceso denegado.");
  }
  return session;
}

export async function adminChangeReservationStatus(
  reservationId: string,
  newStatus: ReservationStatus,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: newStatus },
    });
    revalidatePath("/admin/reservas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}

export async function adminDeleteUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}

export async function adminGetStats() {
  await requireAdmin();
  const [
    totalUsers,
    totalProviders,
    totalAdvertisers,
    totalUnits,
    publishedUnits,
    totalReservations,
    pendingReservations,
    acceptedReservations,
    confirmedReservations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "provider" } }),
    prisma.user.count({ where: { role: "advertiser" } }),
    prisma.inventoryUnit.count(),
    prisma.inventoryUnit.count({ where: { status: "published" } }),
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: "pending_provider" } }),
    prisma.reservation.count({ where: { status: "accepted" } }),
    prisma.reservation.count({ where: { status: "confirmed" } }),
  ]);

  const totalARS = await prisma.reservation.aggregate({
    where: { status: { in: ["accepted", "confirmed"] }, agreedAmount: { not: null } },
    _sum: { agreedAmount: true },
  });

  return {
    totalUsers, totalProviders, totalAdvertisers,
    totalUnits, publishedUnits,
    totalReservations, pendingReservations, acceptedReservations, confirmedReservations,
    totalARS: Number(totalARS._sum.agreedAmount ?? 0),
  };
}
