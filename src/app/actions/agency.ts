"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAgency() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "agency" && session.user.role !== "admin")) {
    throw new Error("Solo agencias pueden realizar esta acción.");
  }
  const profile = await prisma.agencyProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile && session.user.role !== "admin") throw new Error("Sin perfil de agencia.");
  return { session, profile };
}

export async function getAgencyClients() {
  const { profile } = await requireAgency();
  if (!profile) return [];
  return prisma.agencyClient.findMany({
    where: { agencyId: profile.id },
    include: {
      advertiser: {
        select: {
          id: true, email: true,
          advertiserProfile: { select: { legalName: true } },
          reservations: { select: { id: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function addAgencyClient(advertiserEmail: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { profile } = await requireAgency();
    if (!profile) return { ok: false, error: "Sin perfil de agencia." };

    const advertiser = await prisma.user.findUnique({
      where: { email: advertiserEmail.toLowerCase().trim() },
    });
    if (!advertiser) return { ok: false, error: "No encontramos un anunciante con ese email." };
    if (advertiser.role !== "advertiser") return { ok: false, error: "El usuario no es anunciante." };

    await prisma.agencyClient.create({
      data: { agencyId: profile.id, advertiserId: advertiser.id },
    });

    revalidatePath("/agency");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al agregar cliente." };
  }
}

export async function removeAgencyClient(advertiserId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { profile } = await requireAgency();
    if (!profile) return { ok: false, error: "Sin perfil." };

    await prisma.agencyClient.deleteMany({
      where: { agencyId: profile.id, advertiserId },
    });
    revalidatePath("/agency");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}
