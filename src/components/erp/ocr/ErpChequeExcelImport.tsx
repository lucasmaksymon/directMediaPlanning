"use client";

import { useRef, useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import { erpChequeImportContext } from "@/app/actions/erp-billing";
import { Alert } from "@/components/ui";
import type { ErpLineRow } from "@/components/erp/ErpLineList";
import { ErpOcrDropzone } from "@/components/erp/ocr/ErpOcrDropzone";
import { matchChequesByAmount, parseBankCheques } from "@/lib/erp-cheque-excel";
import { parseFormLines } from "@/lib/erp-form-lines";
import { money } from "@/lib/erp";

/** Completa número, fechas y cláusula de los cheques del recibo con el listado de cheques recibidos del banco. */
export function ErpChequeExcelImport({
  prefix,
  fields,
  clientId,
  receiptId,
  onLines,
}: {
  prefix: string;
  fields: string[];
  clientId: string;
  receiptId?: string;
  onLines: (rows: ErpLineRow[], notes: string[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: File[]) {
    const file = files[0];
    const form = ref.current?.closest("form");
    if (!file || !form) return;
    setError(null);
    setPending(true);
    try {
      const current = parseFormLines(new FormData(form), prefix, fields);
      if (!current.some((line) => line.values.paymentKind === "1")) {
        throw new Error("El recibo no tiene pagos con cheque. Cargá primero el recibo de Tango.");
      }
      const sheets = await readXlsxFile(file);
      const all = parseBankCheques((sheets[0]?.data ?? []) as unknown[][]);
      const ctx = await erpChequeImportContext({ clientId, receiptId, numbers: all.map((c) => c.number) });
      if (!ctx.ok) throw new Error(ctx.error);
      const known = new Set(ctx.knownNumbers);
      const fresh = all.filter((c) => !known.has(c.number));
      const ofClient = ctx.clientTaxId ? fresh.filter((c) => c.cuit === ctx.clientTaxId) : [];
      const pool = ofClient.length ? ofClient : fresh;
      const res = matchChequesByAmount(
        current.map((line) => line.values),
        pool,
      );
      const notes = [`Excel: ${res.filled} cheque(s) completado(s).`];
      if (known.size) notes.push(`${known.size} cheque(s) del Excel ya estaban cargados en otros recibos y se ignoraron.`);
      for (const amount of res.unmatched) {
        notes.push(`No hay cheque en el Excel por ${money(Number(amount) || 0)}. Completalo a mano.`);
      }
      onLines(
        res.lines.map((values, i) => ({ id: current[i].id ?? undefined, values })),
        notes,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el Excel.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="sm:col-span-2 xl:col-span-4 space-y-2" ref={ref}>
      <ErpOcrDropzone
        disabled={pending}
        fileKind="excel"
        hint="Listado de cheques recibidos del banco (.xlsx). Se asignan a los cheques del recibo por importe."
        label={pending ? "Leyendo…" : "Completar cheques desde Excel del banco"}
        onFiles={(files) => void onFiles(files)}
      />
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
