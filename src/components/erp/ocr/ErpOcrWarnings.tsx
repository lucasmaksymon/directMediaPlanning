"use client";

import { Alert, Checkbox } from "@/components/ui";

/** Avisos del OCR. Si hay dudas (`review`), pide confirmarlas antes de guardar. */
export function ErpOcrWarnings({
  warnings,
  blockers,
  review,
}: {
  warnings?: string[];
  blockers?: string[];
  review?: string[];
}) {
  const items = [...(blockers ?? []), ...(warnings ?? [])].filter(Boolean);
  const doubts = (review ?? []).filter(Boolean);
  if (!items.length && !doubts.length) return null;
  return (
    <div className="space-y-2 sm:col-span-2 xl:col-span-4">
      {items.length ? (
        <Alert variant={blockers?.length ? "warning" : "info"}>
          <ul className="list-disc space-y-0.5 pl-4">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {doubts.length ? (
        <Alert key={doubts.join("|")} variant="warning">
          <p className="font-medium">Revisar antes de guardar</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {doubts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <Checkbox name="ocrReviewed" required />
            Revisé los datos marcados
          </label>
        </Alert>
      ) : null}
    </div>
  );
}
