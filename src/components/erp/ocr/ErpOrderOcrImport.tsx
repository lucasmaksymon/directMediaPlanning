"use client";

import Link from "next/link";
import { useState } from "react";
import { ocrErpOrder } from "@/app/actions/erp-order-ocr";
import { Alert } from "@/components/ui";
import { ErpOcrDropzone } from "@/components/erp/ocr/ErpOcrDropzone";
import { ErpOcrWarnings } from "@/components/erp/ocr/ErpOcrWarnings";
import { asOcrFile } from "@/lib/erp-ocr-file";
import type { OrderOcrKind, OrderOcrMatchResult } from "@/lib/erp-order-ocr";

export function ErpOrderOcrImport({
  kind,
  currentId,
  editHref,
  onResult,
}: {
  kind: OrderOcrKind;
  currentId?: string | null;
  /** Ruta de la sección; se le agrega ?edit= para abrir la orden duplicada. */
  editHref: string;
  onResult: (result: OrderOcrMatchResult) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<OrderOcrMatchResult | null>(null);

  async function onFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const data = new FormData();
      data.set("file", asOcrFile(file));
      data.set("kind", kind);
      if (currentId) data.set("currentId", currentId);
      const res = await ocrErpOrder(data);
      if (!res.ok) throw new Error(res.error);
      setResult(res.result);
      onResult(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la orden.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="sm:col-span-2 xl:col-span-4 space-y-2">
      <ErpOcrDropzone
        disabled={pending}
        hint={
          currentId
            ? "Subí la versión nueva del PDF para volver a leerla. Reemplaza los campos; revisalos antes de guardar."
            : "Arrastrá el PDF de la orden o hacé clic para elegirlo. Se completan los campos y queda adjunto."
        }
        label={pending ? "Leyendo la orden…" : "Soltá acá el PDF de la orden"}
        onFiles={(files) => void onFiles(files)}
      />
      {error ? <Alert variant="error">{error}</Alert> : null}
      {result?.duplicate ? (
        <Alert variant="warning">
          La orden {result.duplicate.label} ya está cargada.{" "}
          <Link className="font-semibold underline" href={`${editHref}?edit=${result.duplicate.id}`}>
            Abrirla para editarla
          </Link>
        </Alert>
      ) : null}
      {result ? (
        <ErpOcrWarnings
          blockers={result.blockers.filter((b) => !result.duplicate || !b.includes(result.duplicate.label))}
          warnings={result.extracted.warnings}
        />
      ) : null}
    </div>
  );
}
