"use client";

import { Button } from "@/components/ui";
import type { OcrMatchOption } from "@/lib/erp-ocr";

/** Opciones sugeridas por el OCR cuando no está seguro. Elegir una no toca los importes. */
export function ErpOcrCandidates({
  options,
  selected,
  onPick,
}: {
  options: OcrMatchOption[];
  selected?: string | string[];
  onPick: (id: string) => void;
}) {
  const chosen = new Set(Array.isArray(selected) ? selected : selected ? [selected] : []);
  const pending = options.filter((o) => !chosen.has(o.id));
  if (!pending.length) return null;
  return (
    <div className="mt-1 space-y-1">
      <p className="text-[11px] text-[var(--warning,#b54708)]">El OCR no está seguro. ¿Es alguna de estas?</p>
      {pending.map((o) => (
        <Button
          className="h-auto w-full justify-start whitespace-normal py-1 text-left text-xs"
          key={o.id}
          onClick={() => onPick(o.id)}
          size="sm"
          type="button"
          variant="outline"
        >
          <span>
            <span className="font-medium">{o.label}</span>
            {o.reason ? <span className="block text-[11px] text-muted-foreground">{o.reason}</span> : null}
          </span>
        </Button>
      ))}
    </div>
  );
}
