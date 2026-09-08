import { Prisma, ReservationStatus, SlotState } from "@prisma/client";

export const HOLD_MINUTES = Number(process.env.HOLD_MINUTES ?? "15") || 15;

export const BLOCKING_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.pending_provider,
  ReservationStatus.accepted,
  ReservationStatus.payment_pending,
  ReservationStatus.confirmed,
  ReservationStatus.hold,
];

export const BLOCKING_SLOT_STATES: SlotState[] = [
  SlotState.blocked,
  SlotState.reserved_pending,
  SlotState.reserved_confirmed,
];

export function holdExpiresAt(from = new Date(), minutes = HOLD_MINUTES): Date {
  return new Date(from.getTime() + minutes * 60 * 1000);
}

export function isHoldActive(holdExpiresAtValue: Date | null | undefined, now = new Date()): boolean {
  if (!holdExpiresAtValue) return true;
  return holdExpiresAtValue.getTime() > now.getTime();
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

/** Prisma filter: reservas que ocupan el rango (incluye hold no vencido). */
export function overlappingReservationsSome(
  startsAt: Date,
  endsAt: Date,
  now = new Date(),
): Prisma.ReservationListRelationFilter {
  return {
    some: {
      AND: [
        { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
        {
          OR: [
            {
              status: {
                in: [
                  ReservationStatus.pending_provider,
                  ReservationStatus.accepted,
                  ReservationStatus.payment_pending,
                  ReservationStatus.confirmed,
                ],
              },
            },
            {
              status: ReservationStatus.hold,
              OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
            },
          ],
        },
      ],
    },
  };
}

/** Prisma filter: bloques de calendario que ocupan el rango. */
export function overlappingBlockedAvailabilitySome(
  startsAt: Date,
  endsAt: Date,
): Prisma.AvailabilityBlockListRelationFilter {
  return {
    some: {
      state: { in: BLOCKING_SLOT_STATES },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  };
}

export function slotOccupiedWhere(startsAt: Date, endsAt: Date, now = new Date()): Prisma.InventoryUnitWhereInput {
  return {
    OR: [
      { reservations: overlappingReservationsSome(startsAt, endsAt, now) },
      { availability: overlappingBlockedAvailabilitySome(startsAt, endsAt) },
    ],
  };
}

export function reservationOverlapWhere(
  inventoryUnitId: string,
  startsAt: Date,
  endsAt: Date,
  now = new Date(),
): Prisma.ReservationWhereInput {
  return {
    inventoryUnitId,
    startsAt: { lt: endsAt },
    endsAt: { gt: startsAt },
    OR: [
      {
        status: {
          in: [
            ReservationStatus.pending_provider,
            ReservationStatus.accepted,
            ReservationStatus.payment_pending,
            ReservationStatus.confirmed,
          ],
        },
      },
      {
        status: ReservationStatus.hold,
        OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
      },
    ],
  };
}

export function blockedAvailabilityWhere(
  unitId: string,
  startsAt: Date,
  endsAt: Date,
): Prisma.AvailabilityBlockWhereInput {
  return {
    unitId,
    state: { in: BLOCKING_SLOT_STATES },
    startsAt: { lt: endsAt },
    endsAt: { gt: startsAt },
  };
}
