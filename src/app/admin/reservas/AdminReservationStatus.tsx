"use client";

import { useState, useTransition } from "react";
import { ReservationStatus } from "@prisma/client";
import { adminChangeReservationStatus } from "@/app/actions/admin";
import { reservationStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { fieldClass } from "@/lib/ui-classes";

const ALL_STATUSES = [
  ReservationStatus.draft,
  ReservationStatus.pending_provider,
  ReservationStatus.accepted,
  ReservationStatus.rejected,
  ReservationStatus.payment_pending,
  ReservationStatus.confirmed,
  ReservationStatus.cancelled,
];

export function AdminReservationStatus({
  reservationId,
  currentStatus,
}: {
  reservationId: string;
  currentStatus: ReservationStatus;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ReservationStatus;
    startTransition(async () => {
      const res = await adminChangeReservationStatus(reservationId, newStatus);
      if (res.ok) {
        setStatus(newStatus);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert(res.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className={cn(fieldClass, "py-1.5 text-xs")}
        disabled={isPending}
        onChange={handleChange}
        value={status}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>{reservationStatusLabel[s] ?? s}</option>
        ))}
      </select>
      {saved && <span className="text-xs text-led font-semibold">Guardado</span>}
    </div>
  );
}
