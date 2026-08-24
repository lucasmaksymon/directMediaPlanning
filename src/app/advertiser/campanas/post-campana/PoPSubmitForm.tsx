"use client";

import { useActionState } from "react";
import { submitProofOfPlay } from "@/app/actions/proof-of-play";
import { fieldClass, labelClass, btnSecondary } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function PoPSubmitForm({ reservationId }: { reservationId: string }) {
  const bound = submitProofOfPlay.bind(null, reservationId);
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => bound(formData),
    null,
  );

  return (
    <form action={action} className="mt-3 flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className={labelClass} htmlFor={`pop-${reservationId}`}>URL evidencia PoP</label>
        <input className={cn(fieldClass, "mt-1 text-xs")} id={`pop-${reservationId}`} name="fileUrl" type="url" placeholder="https://..." />
      </div>
      <button className={btnSecondary} disabled={pending} type="submit">{pending ? "…" : "Enviar PoP"}</button>
      {state?.ok && <span className="text-xs text-led">Enviado</span>}
    </form>
  );
}
