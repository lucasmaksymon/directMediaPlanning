"use server";

import { ReservationStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requirePlanningSession } from "@/lib/ops-access";

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
    await requirePlanningSession();
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

export async function adminSetUserPassword(
  userId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } }),
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}

const ASSIGNABLE_ROLES = [UserRole.admin, UserRole.planning, UserRole.administration] as const;

export async function adminSetUserRole(
  userId: string,
  role: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireAdmin();
    if (userId === session.user.id) throw new Error("No podés cambiar tu propio rol.");
    if (!ASSIGNABLE_ROLES.includes(role as (typeof ASSIGNABLE_ROLES)[number])) {
      throw new Error("Elegí Admin, Planificación o Administración.");
    }
    await prisma.user.update({ where: { id: userId }, data: { role: role as UserRole } });
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido." };
  }
}

export async function adminCreateUser(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "");
    if (!email.includes("@")) throw new Error("Ingresá un email válido.");
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    if (!ASSIGNABLE_ROLES.includes(role as (typeof ASSIGNABLE_ROLES)[number])) {
      throw new Error("Elegí Admin, Planificación o Administración.");
    }
    await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), role: role as UserRole },
    });
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido.";
    if (message.includes("Unique constraint")) return { ok: false, error: "Ese email ya tiene cuenta." };
    return { ok: false, error: message };
  }
}

export async function adminGetStats() {
  await requirePlanningSession();
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
