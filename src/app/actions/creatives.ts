"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function saveCreativeAsset(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "advertiser") {
    return { ok: false, error: "Debés iniciar sesión como anunciante." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const campaignId = String(formData.get("campaignId") ?? "").trim() || null;
  const mimeType = String(formData.get("mimeType") ?? "").trim() || undefined;

  if (!name || !fileUrl) return { ok: false, error: "Nombre y archivo son obligatorios." };

  if (campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, advertiserId: session.user.id },
    });
    if (!campaign) return { ok: false, error: "Campaña no encontrada." };
  }

  const asset = await prisma.creativeAsset.create({
    data: {
      advertiserId: session.user.id,
      campaignId,
      name,
      fileUrl,
      mimeType,
    },
  });

  revalidatePath("/advertiser/creativos");
  if (campaignId) revalidatePath(`/advertiser/campanas/${campaignId}`);
  return { ok: true, id: asset.id };
}

export async function deleteCreativeAsset(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "advertiser") {
    return { ok: false, error: "Sin permisos." };
  }

  const asset = await prisma.creativeAsset.findFirst({
    where: { id, advertiserId: session.user.id },
  });
  if (!asset) return { ok: false, error: "Creativo no encontrado." };

  await prisma.creativeAsset.delete({ where: { id } });
  revalidatePath("/advertiser/creativos");
  return { ok: true };
}
