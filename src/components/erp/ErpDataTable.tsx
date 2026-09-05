"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ChevronsUpDown, ListFilter, X } from "lucide-react";
import { Button, Search, Table, TBody, TD, TFoot, TH, THead, TR } from "@/components/ui";
import { TableColumnsMenu } from "@/components/erp/TableColumnsMenu";
import { cn } from "@/lib/cn";
import { displayDate } from "@/lib/erp";
import { compareTableValues, useTablePrefs, type TablePin } from "@/lib/table-prefs";

export type ErpTableColumn<T> = {
  id: string;
  label: string;
  group?: string;
  align?: "left" | "right";
  wrap?: boolean;
  headClass?: string;
  cellClass?: string;
  value?: (row: T) => string | number | null | undefined;
  cell: (row: T) => ReactNode;
  foot?: (rows: T[]) => ReactNode;
};

function SortableHead({
  children,
  className,
  filtered,
  id,
  measureRef,
  onSort,
  pin,
  pinEdge,
  pinOffset,
  right,
  sort,
}: {
  children: string;
  className?: string;
  filtered?: boolean;
  id: string;
  measureRef?: (el: HTMLTableCellElement | null) => void;
  onSort: (id: string) => void;
  pin?: TablePin;
  pinEdge?: boolean;
  pinOffset?: number;
  right?: boolean;
  sort?: { id: string; dir: "asc" | "desc" } | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const active = sort?.id === id;
  return (
    <TH
      aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(className, isDragging && "opacity-70")}
      pin={pin}
      pinEdge={pinEdge}
      pinOffset={pinOffset}
      ref={(el) => {
        setNodeRef(el);
        measureRef?.(el);
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <button
        className={cn(
          "inline-flex w-full items-center gap-0.5 text-[11px] font-semibold leading-none",
          right && "justify-end",
        )}
        onClick={() => onSort(id)}
        title={children}
        type="button"
      >
        <span className="truncate">{children}</span>
        {active ? (
          sort?.dir === "asc" ? (
            <ArrowUp className="size-2.5 shrink-0" />
          ) : (
            <ArrowDown className="size-2.5 shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="size-2.5 shrink-0 opacity-35" />
        )}
        {filtered ? <span className="size-1 shrink-0 rounded-full bg-led" /> : null}
      </button>
    </TH>
  );
}

function foldSearch(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function columnSearchText(value: unknown) {
  if (value == null || value === "") return "";
  if (value instanceof Date || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return foldSearch(`${displayDate(date)} ${date.toISOString().slice(0, 10)} ${String(value)}`);
    }
  }
  return foldSearch(String(value));
}

function groupSpans<T>(cols: ErpTableColumn<T>[]) {
  const spans: { group: string; count: number; firstId: string; lastId: string }[] = [];
  for (const col of cols) {
    const group = col.group ?? "";
    const last = spans[spans.length - 1];
    if (last && last.group === group) {
      last.count += 1;
      last.lastId = col.id;
    } else spans.push({ group, count: 1, firstId: col.id, lastId: col.id });
  }
  return spans;
}

const filterInputClass =
  "h-7 w-full min-w-[4.5rem] rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary";

export function ErpDataTable<T>({
  actions,
  columns,
  fill = "page",
  rowClassName,
  rowKey,
  rows,
  storageKey,
  toolbar,
}: {
  actions?: (row: T) => ReactNode;
  columns: ErpTableColumn<T>[];
  fill?: boolean | "page";
  rowClassName?: (row: T) => string | undefined;
  rowKey: (row: T) => string;
  rows: T[];
  storageKey: string;
  toolbar?: ReactNode;
}) {
  const ids = useMemo(() => columns.map((c) => c.id), [columns]);
  const prefs = useTablePrefs(storageKey, ids);
  const byId = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const visible = prefs.displayIds.map((id) => byId.get(id)).filter(Boolean) as ErpTableColumn<T>[];
  const hasGroups = visible.some((c) => c.group);
  const spans = groupSpans(visible);
  const hasActions = Boolean(actions);
  const hasFooter = visible.some((c) => c.foot);
  const startIds = useMemo(
    () => prefs.pinStart.filter((id) => prefs.displayIds.includes(id)),
    [prefs.displayIds, prefs.pinStart],
  );
  const endIds = useMemo(
    () => prefs.pinEnd.filter((id) => prefs.displayIds.includes(id)),
    [prefs.displayIds, prefs.pinEnd],
  );
  const lastStart = startIds[startIds.length - 1];
  const firstEnd = endIds[0];
  const layoutKey = `${prefs.displayIds.join("|")}:${startIds.join(",")}:${endIds.join(",")}`;

  const headRefs = useRef(new Map<string, HTMLTableCellElement>());
  const actionsRef = useRef<HTMLTableCellElement | null>(null);
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  useLayoutEffect(() => {
    function measure() {
      const next: Record<string, number> = {};
      let left = 0;
      for (const id of startIds) {
        next[id] = left;
        left += headRefs.current.get(id)?.getBoundingClientRect().width ?? 0;
      }
      let right = actionsRef.current?.getBoundingClientRect().width ?? 0;
      for (const id of [...endIds].reverse()) {
        next[id] = right;
        right += headRefs.current.get(id)?.getBoundingClientRect().width ?? 0;
      }
      setOffsets((prev) => {
        const keys = Object.keys(next);
        if (keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k])) {
          return prev;
        }
        return next;
      });
    }
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of headRefs.current.values()) ro.observe(el);
    if (actionsRef.current) ro.observe(actionsRef.current);
    return () => ro.disconnect();
  }, [endIds, layoutKey, startIds]);

  const filtered = useMemo(() => {
    const q = foldSearch(query.trim());
    const activeCols = Object.entries(colFilters).filter(([, v]) => v.trim());
    if (!q && activeCols.length === 0) return rows;
    return rows.filter((row) => {
      if (q) {
        const hit = visible.some((col) => columnSearchText(col.value?.(row)).includes(q));
        if (!hit) return false;
      }
      return activeCols.every(([id, raw]) => {
        const col = byId.get(id);
        if (!col?.value) return true;
        return columnSearchText(col.value(row)).includes(foldSearch(raw.trim()));
      });
    });
  }, [byId, colFilters, query, rows, visible]);

  const sorted = useMemo(() => {
    if (!prefs.sort) return filtered;
    const col = byId.get(prefs.sort.id);
    if (!col?.value) return filtered;
    const dir = prefs.sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compareTableValues(col.value?.(a), col.value?.(b)) * dir);
  }, [byId, filtered, prefs.sort]);

  const colFilterCount = Object.values(colFilters).filter((v) => v.trim()).length;
  const hasActiveFilters = Boolean(query.trim()) || colFilterCount > 0;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function onDragEnd(event: DragEndEvent) {
    const overId = event.over ? String(event.over.id) : "";
    if (overId) prefs.move(String(event.active.id), overId);
  }

  function pinProps(id: string): { pin?: TablePin; pinEdge?: boolean; pinOffset?: number } {
    const pin = prefs.pinOf(id) ?? undefined;
    if (!pin) return {};
    return {
      pin,
      pinEdge: pin === "start" ? id === lastStart : id === firstEnd,
      pinOffset: offsets[id] ?? 0,
    };
  }

  function clearFilters() {
    setQuery("");
    setColFilters({});
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="w-full max-w-xs">
            <Search
              className="h-9 py-1.5 text-xs"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              value={query}
            />
          </div>
          <Button
            aria-pressed={showFilters}
            onClick={() => setShowFilters((v) => !v)}
            size="sm"
            type="button"
            variant={showFilters || colFilterCount ? "secondary" : "outline"}
          >
            <ListFilter className="size-3.5" />
            Filtros
            {colFilterCount > 0 ? (
              <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-semibold text-led">
                {colFilterCount}
              </span>
            ) : null}
          </Button>
          {hasActiveFilters ? (
            <Button onClick={clearFilters} size="sm" type="button" variant="ghost">
              <X className="size-3.5" />
              Limpiar
            </Button>
          ) : null}
          <span className="text-xs tabular-nums text-muted-foreground">
            {sorted.length === rows.length
              ? `${rows.length} ${rows.length === 1 ? "fila" : "filas"}`
              : `${sorted.length} de ${rows.length}`}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="contents" data-erp-page-toolbar />
          {toolbar}
          <TableColumnsMenu
            columns={columns.map((c) => ({ id: c.id, label: c.label, group: c.group ?? "" }))}
            hidden={prefs.hidden}
            onMove={prefs.move}
            onPin={prefs.setPin}
            onReset={prefs.reset}
            onToggle={prefs.toggleHidden}
            order={prefs.order}
            pinOf={prefs.pinOf}
          />
        </div>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
        <SortableContext items={visible.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <Table fill={fill}>
            <THead>
              {hasGroups ? (
                <TR className="hover:bg-transparent">
                  {spans.map((span, i) => (
                    <TH
                      className={cn(
                        "py-0.5 text-[10px] font-medium leading-none text-foreground",
                        visible.find((c) => (c.group ?? "") === span.group)?.headClass,
                      )}
                      colSpan={span.count}
                      key={`${span.group}-${i}`}
                      {...pinProps(span.firstId)}
                      pinEdge={
                        prefs.pinOf(span.firstId) === "start"
                          ? span.lastId === lastStart
                          : prefs.pinOf(span.firstId) === "end"
                            ? span.firstId === firstEnd
                            : false
                      }
                    >
                      {span.group}
                    </TH>
                  ))}
                  {hasActions ? (
                    <TH
                      pin="end"
                      pinEdge={endIds.length === 0}
                      ref={actionsRef}
                      rowSpan={showFilters ? 3 : 2}
                    >
                      Acciones
                    </TH>
                  ) : null}
                </TR>
              ) : null}
              <TR className={cn("hover:bg-transparent", showFilters && "[&_th]:border-b-0")}>
                {visible.map((col) => (
                  <SortableHead
                    className={cn(hasGroups && "top-5", col.headClass)}
                    filtered={Boolean(colFilters[col.id]?.trim())}
                    id={col.id}
                    key={col.id}
                    measureRef={(el) => {
                      if (el) headRefs.current.set(col.id, el);
                      else headRefs.current.delete(col.id);
                    }}
                    onSort={prefs.toggleSort}
                    right={col.align === "right"}
                    sort={prefs.sort}
                    {...pinProps(col.id)}
                  >
                    {col.label}
                  </SortableHead>
                ))}
                {hasActions && !hasGroups ? (
                  <TH
                    pin="end"
                    pinEdge={endIds.length === 0}
                    ref={actionsRef}
                    rowSpan={showFilters ? 2 : 1}
                  >
                    Acciones
                  </TH>
                ) : null}
              </TR>
              {showFilters ? (
                <TR className="hover:bg-transparent">
                  {visible.map((col) => (
                    <TH
                      className={cn(
                        "border-t-0 py-1 font-normal",
                        hasGroups ? "top-[3.25rem]" : "top-8",
                        col.headClass,
                      )}
                      key={`filter-${col.id}`}
                      {...pinProps(col.id)}
                    >
                      {col.value ? (
                        <input
                          aria-label={`Filtrar ${col.label}`}
                          className={filterInputClass}
                          onChange={(e) =>
                            setColFilters((prev) => ({ ...prev, [col.id]: e.target.value }))
                          }
                          onPointerDown={(e) => e.stopPropagation()}
                          placeholder="Filtrar"
                          value={colFilters[col.id] ?? ""}
                        />
                      ) : null}
                    </TH>
                  ))}
                </TR>
              ) : null}
            </THead>
            <TBody>
              {sorted.length === 0 ? (
                <TR className="hover:bg-transparent">
                  <TD
                    className="py-10 text-center text-sm text-muted-foreground"
                    colSpan={visible.length + (hasActions ? 1 : 0)}
                  >
                    {rows.length === 0
                      ? "Sin datos."
                      : "Ningún resultado para esta búsqueda."}
                  </TD>
                </TR>
              ) : null}
              {sorted.map((row) => (
                <TR className={cn("group", rowClassName?.(row))} key={rowKey(row)}>
                  {visible.map((col) => (
                    <TD
                      className={cn(
                        col.align === "right" && "text-right tabular-nums",
                        col.wrap && "whitespace-normal",
                        col.cellClass,
                      )}
                      key={col.id}
                      {...pinProps(col.id)}
                    >
                      {col.cell(row)}
                    </TD>
                  ))}
                  {hasActions ? (
                    <TD pin="end" pinEdge={endIds.length === 0}>
                      {actions?.(row)}
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
            {hasFooter && sorted.length > 0 ? (
              <TFoot>
                <TR className="hover:bg-transparent">
                  {visible.map((col) => (
                    <TD
                      className={cn(col.align === "right" && "text-right tabular-nums", col.cellClass)}
                      foot
                      key={col.id}
                      {...pinProps(col.id)}
                    >
                      {col.foot?.(sorted)}
                    </TD>
                  ))}
                  {hasActions ? <TD foot pin="end" pinEdge={endIds.length === 0} /> : null}
                </TR>
              </TFoot>
            ) : null}
          </Table>
        </SortableContext>
      </DndContext>
    </div>
  );
}
