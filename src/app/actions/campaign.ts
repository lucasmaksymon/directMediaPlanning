"use server";

import { CampaignStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CampaignFormState = { error?: string; ok?: boolean; campaignId?: string } | undefined;

async function requireAdvertiser() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "advertiser") {
    throw new Error("Debés iniciar sesión como anunciante.");
  }
  return session;
}

export async function createCampaign(
  _prev: CampaignFormState,
  formData: FormData,
): Promise<CampaignFormState> {
  try {
    const session = await requireAdvertiser();
    const name = String(formData.get("name") ?? "").trim();
    const budgetRaw = String(formData.get("budget") ?? "").trim();
    const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
    const endsAtRaw = String(formData.get("endsAt") ?? "").trim();

    if (!name) return { error: "El nombre de la campaña es obligatorio." };

    const campaign = await prisma.campaign.create({
      data: {
        advertiserId: session.user.id,
        name,
        status: CampaignStatus.draft,
        budget: budgetRaw ? Number(budgetRaw) : undefined,
        startsAt: startsAtRaw ? new Date(`${startsAtRaw}T00:00:00.000Z`) : undefined,
        endsAt: endsAtRaw ? new Date(`${endsAtRaw}T23:59:59.999Z`) : undefined,
      },
    });

    revalidatePath("/advertiser/campanas");
    return { ok: true, campaignId: campaign.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al crear campaña." };
  }
}

export async function updateCampaignStatus(
  campaignId: string,
  status: CampaignStatus,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireAdvertiser();
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, advertiserId: session.user.id },
    });
    if (!campaign) return { ok: false, error: "Campaña no encontrada." };

    await prisma.campaign.update({ where: { id: campaignId }, data: { status } });
    revalidatePath("/advertiser/campanas");
    revalidatePath(`/advertiser/campanas/${campaignId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al actualizar." };
  }
}

export async function linkReservationToCampaign(
  reservationId: string,
  campaignId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireAdvertiser();
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, advertiserId: session.user.id },
    });
    if (!campaign) return { ok: false, error: "Campaña no encontrada." };

    const resv = await prisma.reservation.findFirst({
      where: { id: reservationId, advertiserId: session.user.id },
    });
    if (!resv) return { ok: false, error: "Reserva no encontrada." };

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { campaignId },
    });
    revalidatePath("/advertiser");
    revalidatePath(`/advertiser/campanas/${campaignId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Error al vincular." };
  }
}
