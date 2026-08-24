"use server";

import { ScreenPlatform } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertProviderScreenLimit } from "@/lib/freemium";

async function requireProviderProfile() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "provider" && session.user.role !== "admin")) {
    throw new Error("Acceso denegado.");
  }
  const profile = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile && session.user.role === "provider") throw new Error("Perfil no encontrado.");
  return { session, profile };
}

export async function createScreen(formData: FormData): Promise<{ ok: boolean; error?: string; deviceKey?: string }> {
  try {
    const { profile } = await requireProviderProfile();
    if (!profile) return { ok: false, error: "Perfil no encontrado." };

    const limit = await assertProviderScreenLimit(profile.id);
    if (!limit.ok) return { ok: false, error: limit.error };

    const name = String(formData.get("name") ?? "").trim();
    const platform = (String(formData.get("platform") ?? "web") as ScreenPlatform) || ScreenPlatform.web;
    const inventoryUnitId = String(formData.get("inventoryUnitId") ?? "").trim() || null;

    if (!name) return { ok: false, error: "Nombre obligatorio." };

    const deviceKey = `np_${randomBytes(12).toString("hex")}`;

    await prisma.screen.create({
      data: {
        providerId: profile.id,
        name,
        platform,
        deviceKey,
        inventoryUnitId,
      },
    });

    revalidatePath("/provider/cms");
    return { ok: true, deviceKey };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function createPlaylist(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const { profile } = await requireProviderProfile();
    if (!profile) return { ok: false, error: "Perfil no encontrado." };

    const name = String(formData.get("name") ?? "").trim();
    const screenId = String(formData.get("screenId") ?? "").trim() || null;
    if (!name) return { ok: false, error: "Nombre obligatorio." };

    const playlist = await prisma.playlist.create({
      data: { providerId: profile.id, name, screenId },
    });

    revalidatePath("/provider/cms");
    return { ok: true, id: playlist.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function addPlaylistItem(
  playlistId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { profile } = await requireProviderProfile();
    if (!profile) return { ok: false, error: "Perfil no encontrado." };

    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, providerId: profile.id },
    });
    if (!playlist) return { ok: false, error: "Playlist no encontrada." };

    const creativeUrl = String(formData.get("creativeUrl") ?? "").trim();
    const durationSec = Number(formData.get("durationSec") ?? 10);
    const order = Number(formData.get("order") ?? 0);
    if (!creativeUrl) return { ok: false, error: "URL del creativo obligatoria." };

    await prisma.playlistItem.create({
      data: { playlistId, creativeUrl, durationSec, order },
    });

    revalidatePath(`/provider/cms/playlists/${playlistId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function publishPlaylist(playlistId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { profile } = await requireProviderProfile();
    if (!profile) return { ok: false, error: "Perfil no encontrado." };

    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, providerId: profile.id },
    });
    if (!playlist) return { ok: false, error: "Playlist no encontrada." };

    await prisma.playlist.update({
      where: { id: playlistId },
      data: { publishedAt: new Date(), version: { increment: 1 } },
    });

    revalidatePath("/provider/cms");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}
