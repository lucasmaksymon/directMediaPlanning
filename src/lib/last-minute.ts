import { prisma } from "@/lib/prisma";

export type LastMinuteUnit = {
  id: string;
  name: string;
  locationLabel: string;
  format: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  windowDays: number;
  imageUrl?: string;
};

export async function getLastMinuteUnits(): Promise<LastMinuteUnit[]> {
  const now = new Date();

  const units = await prisma.inventoryUnit.findMany({
    where: {
      status: "published",
      lastMinuteEnabled: true,
    },
    include: {
      reservations: {
        where: {
          status: { in: ["pending_provider", "accepted", "payment_pending", "confirmed"] },
        },
        select: { startsAt: true, endsAt: true },
      },
    },
  });

  return units
    .filter((u) => {
      const windowEnd = new Date(now.getTime() + (u.lastMinuteWindowDays ?? 7) * 24 * 60 * 60 * 1000);
      // Verificar que no tiene reservas en la ventana last-minute
      const hasReservationInWindow = u.reservations.some((r) => r.startsAt <= windowEnd && r.endsAt >= now);
      return !hasReservationInWindow;
    })
    .map((u) => {
      const originalPrice = Number(u.basePriceAmount);
      const discountPercent = u.lastMinuteDiscountPercent ?? 20;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);
      return {
        id: u.id,
        name: u.name,
        locationLabel: u.locationLabel,
        format: u.format,
        originalPrice,
        discountedPrice,
        discountPercent,
        windowDays: u.lastMinuteWindowDays ?? 7,
        imageUrl: u.imageUrls?.[0] ?? undefined,
      };
    });
}
