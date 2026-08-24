import { prisma } from "@/lib/prisma";

export async function getFreemiumMaxScreens(): Promise<number> {
  const settings = await prisma.platformSettings.findUnique({ where: { id: "default" } });
  return settings?.freemiumMaxScreens ?? 10;
}

export async function assertProviderScreenLimit(providerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerId },
    include: { organization: true },
  });
  if (!profile) return { ok: false, error: "Proveedor no encontrado." };

  const maxScreens =
    profile.organization?.plan === "freemium" || !profile.organization
      ? profile.organization?.maxScreens ?? (await getFreemiumMaxScreens())
      : profile.organization.maxScreens;

  const [unitCount, screenCount] = await Promise.all([
    prisma.inventoryUnit.count({ where: { providerId } }),
    prisma.screen.count({ where: { providerId } }),
  ]);

  const total = unitCount + screenCount;
  if (total >= maxScreens) {
    return {
      ok: false,
      error: `Alcanzaste el límite del plan (${maxScreens} pantallas). Actualizá a PRO para agregar más.`,
    };
  }
  return { ok: true };
}
