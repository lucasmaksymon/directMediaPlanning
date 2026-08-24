"use client";

import { useActionState } from "react";
import { sendPublicationOrder } from "@/app/actions/publication";
import { fieldClass, labelClass, btnSecondary } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";

export function PublicationOrderForm({
  reservationId,
  creativeIds,
}: {
  reservationId: string;
  creativeIds: string[];
}) {
  const bound = sendPublicationOrder.bind(null, reservationId);
  const [state, action, pending] = useActionState(
    async (_: unknown, formData: FormData) => bound(formData),
    null,
  );

  return (
    <form action={action} className="mt-2 space-y-2 border-t border-border pt-2">
      <p className="text-xs font-semibold text-muted-foreground">Orden de publicación</p>
      {creativeIds.map((id) => (
        <label key={id} className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="creativeAssetIds" value={id} className="accent-led" />
          Creativo {id.slice(0, 8)}…
        </label>
      ))}
      <div>
        <label className={labelClass} htmlFor={`instr-${reservationId}`}>Instrucciones</label>
        <textarea className={cn(fieldClass, "mt-1 text-xs min-h-[60px]")} id={`instr-${reservationId}`} name="instructions" />
      </div>
      <button className={btnSecondary} disabled={pending} type="submit">{pending ? "…" : "Enviar al medio"}</button>
      {state?.ok && <span className="text-xs text-led">Enviada</span>}
    </form>
  );
}
