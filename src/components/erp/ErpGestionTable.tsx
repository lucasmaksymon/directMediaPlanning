"use client";

import { ErpDataTable, type ErpTableColumn } from "@/components/erp/ErpDataTable";
import { GESTION_COLS, GROUP_TINT, gestionActions } from "@/components/erp/erp-gestion-columns";
import type { GestionLineRow } from "@/lib/erp-gestion";

const columns: ErpTableColumn<GestionLineRow>[] = GESTION_COLS.map((col) => {
  const tint = GROUP_TINT[col.group];
  return {
    id: col.id,
    label: col.label,
    group: col.group,
    align: col.align,
    headClass: tint.head,
    cellClass: tint.body,
    value: col.value,
    cell: col.cell,
    foot: col.foot
      ? (rows) => {
          const totals = rows.reduce(
            (acc, r) => {
              acc.purchase += r.purchase?.total ?? 0;
              acc.production += r.production?.total ?? 0;
              acc.sale += r.sale?.total ?? 0;
              acc.ganancia += r.ganancia ?? 0;
              return acc;
            },
            { purchase: 0, production: 0, sale: 0, ganancia: 0 },
          );
          return col.foot?.({
            ...totals,
            gananciaPct: totals.sale !== 0 ? (totals.ganancia * 100) / totals.sale : null,
          });
        }
      : undefined,
  };
});

export function ErpGestionTable({ rows }: { rows: GestionLineRow[] }) {
  return (
    <ErpDataTable
      actions={gestionActions}
      columns={columns}
      fill="page"
      rowKey={(r) => r.id}
      rows={rows}
      storageKey="erp.table.gestion.v1"
    />
  );
}
