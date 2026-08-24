"use server";

import { PoPStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireOpsSession } from "@/lib/ops-access";

export async function submitProofOfPlay(
  reservationId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "No autenticado." };

  const fileUrl = String(formData.get("fileUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  const resv = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      OR: [
        { advertiserId: session.user.id },
        { inventoryUnit: { provider: { userId: session.user.id } } },
      ],
    },
  });
  if (!resv) return { ok: false, error: "Reserva no encontrada." };

  await prisma.proofOfPlay.upsert({
    where: { reservationId },
    create: {
      reservationId,
      fileUrl: fileUrl || undefined,
      notes,
      status: PoPStatus.submitted,
      submittedAt: new Date(),
    },
    update: {
      fileUrl: fileUrl || undefined,
      notes,
      status: PoPStatus.submitted,
      submittedAt: new Date(),
    },
  });

  revalidatePath(`/advertiser/campanas/post-campana`);
  revalidatePath("/provider/reservas");
  return { ok: true };
}

export async function verifyProofOfPlay(
  reservationId: string,
  approved: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireOpsSession();
    await prisma.proofOfPlay.update({
      where: { reservationId },
      data: {
        status: approved ? PoPStatus.verified : PoPStatus.rejected,
        verifiedAt: new Date(),
      },
    });
    revalidatePath("/admin/reservas");
    return { ok: true };
  } catch {
    return { ok: false, error: "Sin permisos." };
  }
}
