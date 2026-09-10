"use client";

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ScanSearch } from "lucide-react";
import {
  importOcrPurchaseInvoices,
  importOcrSaleInvoices,
  importOcrSaleReceipts,
  ocrErpDocument,
} from "@/app/actions/erp-ocr";
import { Alert, Autocomplete, Badge, Button, Checkbox, Input, Modal, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { ErpOcrDropzone } from "@/components/erp/ocr/ErpOcrDropzone";
import { cn } from "@/lib/cn";
import { ocrFormData } from "@/lib/erp-ocr-file";
import { ocrDraftFromMatch, type OcrFormDraft, type OcrKind, type OcrMatchResult } from "@/lib/erp-ocr";

const TOOLBAR_SLOT = "[data-erp-page-toolbar]";

type Catalog = { value: string; label: string; vendorId?: string };

type ImportRow = {
  id: string;
  filename: string;
  fileUrl: string;
  mime: string;
  status: "queued" | "reading" | "review" | "error" | "imported" | "failed";
  error?: string;
  selected: boolean;
  result?: OcrMatchResult;
  draft: OcrFormDraft;
};

const KIND_TITLE: Record<OcrKind, string> = {
  sale_invoice: "Importar facturas de venta",
  purchase_invoice: "Importar facturas de compra",
  sale_receipt: "Importar recibos de cobranza",
};

function emptyDraft(): OcrFormDraft {
  return ocrDraftFromMatch({
    extracted: {
      kind: "sale_invoice",
      docType: "A",
      pos: 1,
      number: null,
      issuedAt: "",
      dueAt: null,
      isCreditNote: false,
      detail: null,
      issuer: { legalName: null, taxId: null },
      recipient: { legalName: null, taxId: null },
      amount: null,
      vat: null,
      total: null,
      nonTaxable: null,
      internalTax: null,
      retVat: null,
      retGan: null,
      retSuss: null,
      retIibb: null,
      iibbCaba: null,
      iibbBsAs: null,
      vatWithholding: null,
      collected: null,
      balance: null,
      payments: [],
      cae: null,
      warnings: [],
      fieldConfidence: {},
    },
    attachmentUrl: null,
    client: null,
    vendor: null,
    saleOrder: null,
    purchaseOrder: null,
    invoices: [],
    duplicate: null,
    ready: false,
    blockers: [],
  });
}

function rowReady(kind: OcrKind, row: ImportRow) {
  if (row.status !== "review") return false;
  if (row.result?.duplicate) return false;
  if (!row.draft.number || !row.draft.issuedAt) return false;
  if (kind === "sale_invoice") return Boolean(row.draft.saleOrderId);
  if (kind === "purchase_invoice") return Boolean(row.draft.vendorId && row.draft.orderId);
  return Boolean(row.draft.clientId);
}

function statusBadge(row: ImportRow, kind: OcrKind) {
  if (row.status === "reading" || row.status === "queued") return <Badge>Leyendo</Badge>;
  if (row.status === "error") return <Badge variant="error">Error</Badge>;
  if (row.status === "imported") return <Badge variant="success">Importado</Badge>;
  if (row.status === "failed") return <Badge variant="error">Falló</Badge>;
  if (row.result?.duplicate) return <Badge variant="warning">Duplicado</Badge>;
  if (rowReady(kind, row)) return <Badge variant="success">Listo</Badge>;
  return <Badge variant="warning">Incompleto</Badge>;
}

function patchDraft(row: ImportRow, patch: Partial<OcrFormDraft>): ImportRow {
  return { ...row, draft: { ...row.draft, ...patch } };
}

export function ErpOcrImportClient({
  kind,
  clients = [],
  vendors = [],
  saleOrders = [],
  purchaseOrders = [],
  invoices = [],
}: {
  kind: OcrKind;
  clients?: Catalog[];
  vendors?: Catalog[];
  saleOrders?: Catalog[];
  purchaseOrders?: Catalog[];
  invoices?: Catalog[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toolbarSlot, setToolbarSlot] = useState<Element | null>(null);

  const reviewable = rows.filter((row) => row.status === "review");
  const selected = reviewable.filter((row) => row.selected && rowReady(kind, row));
  const progress = rows.filter((row) => row.status === "reading" || row.status === "queued").length;
  const invoiceOptions = useMemo(() => invoices, [invoices]);
  const imported = rows.some((row) => row.status === "imported");

  useLayoutEffect(() => {
    function sync() {
      setToolbarSlot(document.querySelector(TOOLBAR_SLOT));
    }
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    if (imported) router.refresh();
  }, [imported, router]);

  function updateRow(id: string, updater: (row: ImportRow) => ImportRow) {
    setRows((prev) => prev.map((row) => (row.id === id ? updater(row) : row)));
  }

  async function readFiles(files: File[]) {
    if (!files.length) return;
    setMessage(null);
    setBusy(true);
    const queued = files.map((file, index) => {
      const preview = URL.createObjectURL(file);
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        filename: file.name,
        fileUrl: preview,
        mime: file.type,
        status: "reading" as const,
        selected: false,
        draft: emptyDraft(),
        file,
      };
    });
    setRows((prev) => [...queued.map(({ file: _file, ...row }) => row), ...prev]);
    for (const row of queued) {
      const res = await ocrErpDocument(ocrFormData(row.file, kind, false));
      if (!res.ok) {
        updateRow(row.id, (current) => ({ ...current, status: "error", error: res.error }));
        continue;
      }
      const draft = ocrDraftFromMatch(res.result);
      updateRow(row.id, (current) => ({
        ...current,
        status: "review",
        result: res.result,
        fileUrl: res.result.attachmentUrl || current.fileUrl,
        draft,
        selected: res.result.ready,
        error: undefined,
      }));
    }
    setBusy(false);
  }

  async function importSelected() {
    if (!selected.length) return;
    setBusy(true);
    setMessage(null);
    try {
      if (kind === "sale_invoice") {
        const res = await importOcrSaleInvoices(
          selected.map((row) => ({
            saleOrderId: row.draft.saleOrderId,
            issuedAt: row.draft.issuedAt,
            dueAt: row.draft.dueAt || undefined,
            docType: row.draft.docType,
            pos: row.draft.pos,
            number: row.draft.number,
            amount: row.draft.amount,
            vat: row.draft.vat,
            legalName: row.draft.legalName,
            detail: row.draft.detail,
            retVat: row.draft.retVat,
            retSuss: row.draft.retSuss,
            retGan: row.draft.retGan,
            retIibb: row.draft.retIibb,
            attachmentUrl: row.draft.attachmentUrl,
          })),
        );
        applyImport(res, selected);
      } else if (kind === "purchase_invoice") {
        const res = await importOcrPurchaseInvoices(
          selected.map((row) => ({
            vendorId: row.draft.vendorId,
            orderId: row.draft.orderId,
            issuedAt: row.draft.issuedAt,
            dueAt: row.draft.dueAt || undefined,
            docType: row.draft.docType,
            pos: row.draft.pos,
            number: row.draft.number,
            amount: row.draft.amount,
            vat: row.draft.vat,
            vatWithholding: row.draft.vatWithholding,
            iibbCaba: row.draft.iibbCaba,
            iibbBsAs: row.draft.iibbBsAs,
            internalTax: row.draft.internalTax,
            nonTaxable: row.draft.nonTaxable,
            isCreditNote: row.draft.isCreditNote,
            attachmentUrl: row.draft.attachmentUrl,
          })),
        );
        applyImport(res, selected);
      } else {
        const res = await importOcrSaleReceipts(
          selected.map((row) => ({
            clientId: row.draft.clientId,
            issuedAt: row.draft.issuedAt,
            number: row.draft.number,
            amount: row.draft.amount,
            balance: row.draft.balance,
            invoiceIds: row.draft.invoiceIds,
            attachmentUrl: row.draft.attachmentUrl,
            payments: row.result?.extracted.payments,
          })),
        );
        applyImport(res, selected);
      }
    } finally {
      setBusy(false);
    }
  }

  function applyImport(
    res: { ok: true; results: { index: number; ok: boolean; error?: string }[] } | { ok: false; error: string },
    batch: ImportRow[],
  ) {
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    const byId = new Map(batch.map((row, index) => [row.id, res.results[index]]));
    setRows((prev) =>
      prev.map((row) => {
        const item = byId.get(row.id);
        if (!item) return row;
        return item.ok
          ? { ...row, status: "imported" as const, selected: false }
          : { ...row, status: "failed" as const, error: item.error, selected: false };
      }),
    );
    const ok = res.results.filter((item) => item.ok).length;
    const fail = res.results.length - ok;
    setMessage(`Importadas ${ok}${fail ? ` · ${fail} con error` : ""}.`);
    if (ok) router.refresh();
  }

  const trigger = (
    <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
      <ScanSearch className="size-3.5" />
      Importar lote
    </Button>
  );

  return (
    <>
      {toolbarSlot ? createPortal(trigger, toolbarSlot) : <div className="flex justify-end">{trigger}</div>}
      <Modal
        className="sm:max-w-[min(96vw,80rem)]"
        footer={
          <>
            <Button disabled={busy || !selected.length} onClick={() => void importSelected()} size="sm">
              Importar {selected.length || ""}
            </Button>
            <Button onClick={close} size="sm" type="button" variant="ghost">
              Cerrar
            </Button>
          </>
        }
        onClose={close}
        open={open}
        size="xl"
        title={KIND_TITLE[kind]}
      >
        <div className="space-y-3">
          <ErpOcrDropzone
            disabled={busy}
            hint={
              progress > 0
                ? `Leyendo ${rows.length - progress}/${rows.length}`
                : "Arrastrá varios PDF o imágenes, o hacé clic para elegir."
            }
            label={busy ? "Procesando…" : "Soltá acá o elegí PDF / imágenes"}
            multiple
            onFiles={(files) => void readFiles(files)}
          />
          {message ? <Alert variant="info">{message}</Alert> : null}
          {rows.length === 0 ? (
            <Alert>
              Subí varios PDF o imágenes de este tipo. El OCR sugiere los vínculos; las filas incompletas o duplicadas no
              se importan.
            </Alert>
          ) : (
            <Table fill={false}>
              <THead>
                <TR>
                  <TH>
                    <Checkbox
                      checked={
                        reviewable.length > 0 &&
                        selected.length === reviewable.filter((row) => rowReady(kind, row)).length
                      }
                      onChange={(e) => {
                        const next = e.currentTarget.checked;
                        setRows((prev) =>
                          prev.map((row) =>
                            row.status === "review" && rowReady(kind, row) ? { ...row, selected: next } : row,
                          ),
                        );
                      }}
                    />
                  </TH>
                  <TH>Archivo</TH>
                  <TH>Estado</TH>
                  <TH>CUIT / razón</TH>
                  <TH>Comprobante</TH>
                  <TH>Fecha</TH>
                  <TH>Neto / IVA</TH>
                  <TH>
                    {kind === "purchase_invoice"
                      ? "Proveedor / orden"
                      : kind === "sale_invoice"
                        ? "O.P. venta"
                        : "Cliente / facturas"}
                  </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <Checkbox
                        checked={row.selected}
                        disabled={!rowReady(kind, row)}
                        onChange={(e) => updateRow(row.id, (current) => ({ ...current, selected: e.target.checked }))}
                      />
                    </TD>
                    <TD>
                      <a
                        className="font-medium text-led hover:underline"
                        href={row.fileUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {row.filename}
                      </a>
                      {row.error ? <p className="text-[11px] text-error">{row.error}</p> : null}
                      {row.result?.blockers.length && row.status === "review" ? (
                        <p className="max-w-[16rem] text-[11px] text-muted-foreground">
                          {row.result.blockers.join(" · ")}
                        </p>
                      ) : null}
                    </TD>
                    <TD>{statusBadge(row, kind)}</TD>
                    <TD className="max-w-[12rem]">
                      <p className="truncate">
                        {kind === "purchase_invoice"
                          ? row.result?.extracted.issuer.legalName
                          : row.result?.extracted.recipient.legalName ||
                            row.result?.extracted.issuer.legalName ||
                            "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {kind === "purchase_invoice"
                          ? row.result?.extracted.issuer.taxId
                          : row.result?.extracted.recipient.taxId || row.result?.extracted.issuer.taxId || "—"}
                      </p>
                    </TD>
                    <TD>
                      <div className="flex min-w-[12rem] gap-1">
                        <Input
                          className="w-14"
                          defaultValue={row.draft.docType}
                          key={`${row.id}-type-${row.draft.docType}`}
                          onBlur={(e) => updateRow(row.id, (current) => patchDraft(current, { docType: e.target.value }))}
                        />
                        <Input
                          className="w-16"
                          defaultValue={row.draft.pos}
                          key={`${row.id}-pos-${row.draft.pos}`}
                          onBlur={(e) => updateRow(row.id, (current) => patchDraft(current, { pos: e.target.value }))}
                        />
                        <Input
                          className="w-24"
                          defaultValue={row.draft.number}
                          key={`${row.id}-n-${row.draft.number}`}
                          onBlur={(e) => updateRow(row.id, (current) => patchDraft(current, { number: e.target.value }))}
                        />
                      </div>
                    </TD>
                    <TD>
                      <Input
                        defaultValue={row.draft.issuedAt}
                        key={`${row.id}-d-${row.draft.issuedAt}`}
                        onBlur={(e) => updateRow(row.id, (current) => patchDraft(current, { issuedAt: e.target.value }))}
                        type="date"
                      />
                    </TD>
                    <TD>
                      <div className="flex min-w-[10rem] gap-1">
                        <Input
                          defaultValue={row.draft.amount}
                          key={`${row.id}-a-${row.draft.amount}`}
                          onBlur={(e) => updateRow(row.id, (current) => patchDraft(current, { amount: e.target.value }))}
                        />
                        <Input
                          className={cn(kind === "sale_receipt" && "hidden")}
                          defaultValue={row.draft.vat}
                          key={`${row.id}-v-${row.draft.vat}`}
                          onBlur={(e) => updateRow(row.id, (current) => patchDraft(current, { vat: e.target.value }))}
                        />
                      </div>
                    </TD>
                    <TD className="min-w-[16rem]">
                      {kind === "sale_invoice" ? (
                        <Autocomplete
                          compact
                          onChange={(value) => updateRow(row.id, (current) => patchDraft(current, { saleOrderId: value }))}
                          options={saleOrders}
                          placeholder="O.P. venta…"
                          value={row.draft.saleOrderId}
                        />
                      ) : null}
                      {kind === "purchase_invoice" ? (
                        <div className="space-y-1">
                          <Autocomplete
                            compact
                            onChange={(value) =>
                              updateRow(row.id, (current) => {
                                const keep = purchaseOrders.some(
                                  (o) => o.value === current.draft.orderId && o.vendorId === value,
                                );
                                return patchDraft(current, {
                                  vendorId: value,
                                  orderId: keep ? current.draft.orderId : "",
                                });
                              })
                            }
                            options={vendors}
                            placeholder="Proveedor…"
                            value={row.draft.vendorId}
                          />
                          <Autocomplete
                            compact
                            disabled={!row.draft.vendorId}
                            onChange={(value) => updateRow(row.id, (current) => patchDraft(current, { orderId: value }))}
                            options={purchaseOrders.filter((o) => o.vendorId === row.draft.vendorId)}
                            placeholder={row.draft.vendorId ? "Orden de este proveedor…" : "Elegí un proveedor…"}
                            value={row.draft.orderId}
                          />
                        </div>
                      ) : null}
                      {kind === "sale_receipt" ? (
                        <div className="space-y-1">
                          <Autocomplete
                            compact
                            onChange={(value) => updateRow(row.id, (current) => patchDraft(current, { clientId: value }))}
                            options={clients}
                            placeholder="Cliente…"
                            value={row.draft.clientId}
                          />
                          <Autocomplete
                            compact
                            multiple
                            onChange={(value) =>
                              updateRow(row.id, (current) => patchDraft(current, { invoiceIds: value }))
                            }
                            options={invoiceOptions}
                            placeholder="Facturas…"
                            value={row.draft.invoiceIds}
                          />
                        </div>
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </Modal>
    </>
  );
}
