"use client";

import { Alert } from "@/components/ui";

export function ErpOcrWarnings({ warnings, blockers }: { warnings?: string[]; blockers?: string[] }) {
  const items = [...(blockers ?? []), ...(warnings ?? [])].filter(Boolean);
  if (!items.length) return null;
  return (
    <Alert className="sm:col-span-2 xl:col-span-4" variant={blockers?.length ? "warning" : "info"}>
      <ul className="list-disc space-y-0.5 pl-4">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Alert>
  );
}
