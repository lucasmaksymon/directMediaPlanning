"use client";

import { useState } from "react";
import { ocrErpDocument } from "@/app/actions/erp-ocr";
import { Alert } from "@/components/ui";
import { ErpOcrDropzone } from "@/components/erp/ocr/ErpOcrDropzone";
import { ocrFormData } from "@/lib/erp-ocr-file";
import type { OcrKind, OcrMatchResult } from "@/lib/erp-ocr";

export function ErpOcrImport({
  kind,
  issuedOnly = true,
  onResult,
}: {
  kind: OcrKind;
  issuedOnly?: boolean;
  onResult: (result: OcrMatchResult) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const res = await ocrErpDocument(ocrFormData(file, kind, issuedOnly));
      if (!res.ok) throw new Error(res.error);
      onResult(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el comprobante.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="sm:col-span-2 xl:col-span-4 space-y-2">
      <ErpOcrDropzone
        disabled={pending}
        hint="Arrastrá un PDF o imagen, o hacé clic para elegir. Revisá los campos antes de guardar."
        label={pending ? "Leyendo…" : "Soltá acá o elegí un PDF / imagen"}
        onFiles={(files) => void onFiles(files)}
      />
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
