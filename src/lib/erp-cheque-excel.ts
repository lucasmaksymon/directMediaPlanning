import { ERP_PAY } from "@/lib/erp";

/** checkOrder: 1 al día, 2 diferido. */
export const CHECK_ORDER = { onTime: 1, deferred: 2 } as const;
/** checkType: 2 E-cheq. Nunca reciben cheques físicos. */
export const CHECK_TYPE_ECHEQ = 2;
/** checkMode: 1 a la orden, 2 cruzado. */
export const CHECK_MODE = { toOrder: 1, crossed: 2 } as const;

export const SALE_PAY_STATUS = { pending: 0, collected: 1 } as const;

export type BankCheque = {
  number: string;
  clause: string;
  cuit: string;
  issuedAt: string;
  paidAt: string;
  amount: number;
};

export type SalePayValues = Record<string, string>;

export function checkOrderFor(issuedAt: string | null | undefined, paidAt: string | null | undefined) {
  if (!issuedAt || !paidAt) return 0;
  return issuedAt === paidAt ? CHECK_ORDER.onTime : CHECK_ORDER.deferred;
}

export function checkModeFor(clause: string) {
  const c = normalize(clause);
  if (c.includes("cruzado")) return CHECK_MODE.crossed;
  if (c.includes("a la orden") && !c.includes("no a la orden")) return CHECK_MODE.toOrder;
  return 0;
}

/** Valores por defecto de una línea de cobro: los cheques entran pendientes y como E-cheq; el resto, cobrado. */
export function salePayDefaults(line: {
  paymentKind: number;
  issuedAt?: string | null;
  paidAt?: string | null;
  checkOrder?: number;
  checkMode?: number;
}) {
  if (line.paymentKind !== ERP_PAY.cheque) {
    return { estado: SALE_PAY_STATUS.collected, checkType: 0, checkOrder: 0, checkMode: 0 };
  }
  return {
    estado: SALE_PAY_STATUS.pending,
    checkType: CHECK_TYPE_ECHEQ,
    checkOrder: checkOrderFor(line.issuedAt, line.paidAt) || line.checkOrder || 0,
    checkMode: line.checkMode ?? 0,
  };
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\uFFFD/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function isoFromParts(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Excel guarda fechas sin zona; las librerías las devuelven como Date en UTC. */
export function excelDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return isoFromParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === "number" && value > 20000) {
    const date = new Date(Math.round((value - 25569) * 86400000));
    return isoFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const text = String(value ?? "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return isoFromParts(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  return "";
}

function excelAmount(value: unknown) {
  if (typeof value === "number") return value;
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  return Number(normalized.replace(/[^\d.-]/g, "")) || 0;
}

/**
 * Lee el "ListadoChequesRecibidos" del banco. La primera fila agrupa columnas;
 * los títulos reales están en la fila que contiene "N° de cheque".
 */
export function parseBankCheques(rows: unknown[][]): BankCheque[] {
  const headerIndex = rows.findIndex((row) => row.some((cell) => /^n.? ?de cheque$/.test(normalize(cell))));
  if (headerIndex < 0) throw new Error("No encontré la columna «N° de cheque» en el Excel.");
  const header = rows[headerIndex].map(normalize);
  const col = (test: (h: string) => boolean) => header.findIndex(test);
  const iNumber = col((h) => /^n.? ?de cheque$/.test(h));
  const iClause = col((h) => h === "clausula");
  const iCuit = col((h) => h.startsWith("cuit"));
  const iPaid = col((h) => h === "fecha de pago");
  const iIssued = col((h) => h === "fecha de emision");
  const iAmount = col((h) => h === "importe");
  if ([iPaid, iIssued, iAmount].some((i) => i < 0)) {
    throw new Error("El Excel no tiene las columnas de fechas e importe esperadas.");
  }
  return rows
    .slice(headerIndex + 1)
    .map((row) => ({
      number: String(row[iNumber] ?? "").trim(),
      clause: iClause >= 0 ? String(row[iClause] ?? "").trim() : "",
      cuit: iCuit >= 0 ? digits(row[iCuit]) : "",
      issuedAt: excelDate(row[iIssued]),
      paidAt: excelDate(row[iPaid]),
      amount: excelAmount(row[iAmount]),
    }))
    .filter((row) => row.number && row.amount > 0);
}

export type ChequeMatchResult = {
  lines: SalePayValues[];
  filled: number;
  unmatched: string[];
  unusedRows: number;
};

/** A cada cheque del recibo le asigna una fila del banco con el mismo importe; cada fila se usa una vez. */
export function matchChequesByAmount(lines: SalePayValues[], cheques: BankCheque[]): ChequeMatchResult {
  const used = new Set<number>();
  const unmatched: string[] = [];
  let filled = 0;
  const next = lines.map((line) => {
    if (Number(line.paymentKind) !== ERP_PAY.cheque) return line;
    const amount = Number(line.amount) || 0;
    const index = cheques.findIndex((c, i) => !used.has(i) && Math.abs(c.amount - amount) < 0.01);
    if (index < 0) {
      unmatched.push(line.amount || "sin importe");
      return line;
    }
    used.add(index);
    filled += 1;
    const cheque = cheques[index];
    return {
      ...line,
      number: cheque.number,
      issuedAt: cheque.issuedAt,
      paidAt: cheque.paidAt,
      checkOrder: String(checkOrderFor(cheque.issuedAt, cheque.paidAt)),
      checkType: String(CHECK_TYPE_ECHEQ),
      checkMode: String(checkModeFor(cheque.clause)),
      estado: String(SALE_PAY_STATUS.pending),
    };
  });
  return { lines: next, filled, unmatched, unusedRows: cheques.length - used.size };
}
