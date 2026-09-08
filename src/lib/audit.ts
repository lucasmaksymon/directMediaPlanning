import type { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type EventDb = {
  reservationEvent: {
    create: (args: {
      data: {
        reservationId: string;
        action: string;
        actorUserId?: string;
        fromStatus?: ReservationStatus;
        toStatus?: ReservationStatus;
        note?: string;
      };
    }) => Promise<unknown>;
  };
};

export async function logReservationEvent(
  params: {
    reservationId: string;
    action: string;
    actorUserId?: string | null;
    fromStatus?: ReservationStatus | null;
    toStatus?: ReservationStatus | null;
    note?: string | null;
  },
  db: EventDb = prisma,
): Promise<void> {
  try {
    await db.reservationEvent.create({
      data: {
        reservationId: params.reservationId,
        action: params.action,
        actorUserId: params.actorUserId ?? undefined,
        fromStatus: params.fromStatus ?? undefined,
        toStatus: params.toStatus ?? undefined,
        note: params.note ?? undefined,
      },
    });
  } catch (e) {
    logger.error("reservation_event_failed", {
      reservationId: params.reservationId,
      action: params.action,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
