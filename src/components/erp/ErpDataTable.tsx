"use client";

import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
import { ArrowDown, ArrowUp, CalendarDays, Check, ChevronDown, ChevronsUpDown, ListFilter, X } from "lucide-react";
import { Button, Pagination, Search, Table, TBody, TD, TFoot, TH, THead, TR, Select } from "@/components/ui";
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
  /** Texto para buscar/filtrar cuando `value` es un código (p. ej. 0/1) y no lo que se ve en la celda. */
  filterText?: (row: T) => string | string[];
  /** "date": `value` es un timestamp y el filtro es un rango desde/hasta. */
  filter?: "date";
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
  stickyTop,
}: {
  children: string;
  stickyTop?: number;
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
      style={{ transform: CSS.Transform.toString(transform), transition, top: stickyTop }}
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

function columnRowText<T>(col: ErpTableColumn<T>, row: T) {
  if (col.filterText) return foldSearch([col.filterText(row)].flat().join(" "));
  const value = col.value?.(row);
  if (col.filter === "date" && typeof value === "number") return columnSearchText(new Date(value));
  return columnSearchText(value);
}

/** Día local (yyyy-mm-dd), igual al que muestra `displayDate`. */
function localDayKey(value: unknown) {
  if (value == null || value === "") return null;
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateRange(raw: string) {
  const [from = "", to = ""] = raw.split("|");
  return { from, to };
}

function matchesDateRange(value: unknown, raw: string) {
  const { from, to } = parseDateRange(raw);
  const day = localDayKey(value);
  if (!day) return false;
  return (!from || day >= from) && (!to || day <= to);
}

const MAX_FILTER_OPTIONS = 500;

function filterOptions<T>(col: ErpTableColumn<T>, rows: T[]) {
  if (col.filter === "date" || !col.value) return null;
  const seen = new Set<string>();
  for (const row of rows) {
    const texts = col.filterText ? [col.filterText(row)].flat() : [col.value(row)];
    for (const text of texts) {
      if (typeof text !== "string") return null;
      const trimmed = text.trim();
      if (trimmed) seen.add(trimmed);
    }
    if (seen.size > MAX_FILTER_OPTIONS) return null;
  }
  if (seen.size === 0) return null;
  return [...seen].sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
}

function FilterCombobox({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[] | undefined;
  value: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 });

  const shown = useMemo(() => {
    if (!options) return [];
    const q = foldSearch(value.trim());
    if (!q || options.some((o) => foldSearch(o) === q)) return options;
    return options.filter((o) => foldSearch(o).includes(q));
  }, [options, value]);
  const listOpen = open && shown.length > 0;

  useLayoutEffect(() => {
    if (!listOpen) return;
    const place = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.max(rect.width, 180);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const maxHeight = Math.min(240, Math.max(spaceBelow, spaceAbove, 120));
      const above = spaceBelow < 140 && spaceAbove > spaceBelow;
      setPos({
        top: above ? rect.top - maxHeight - 4 : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        maxHeight,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [listOpen, shown.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: globalThis.MouseEvent) => {
      const target = e.target as Node;
      if (inputRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(option: string) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        aria-autocomplete={options ? "list" : undefined}
        aria-controls={options ? listId : undefined}
        aria-expanded={options ? listOpen : undefined}
        aria-label={`Filtrar ${label}`}
        autoComplete="off"
        className={cn(filterInputClass, (options || value) && "pr-5")}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!options) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight((i) => Math.min(i + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && listOpen && shown[highlight]) {
            e.preventDefault();
            pick(shown[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder="Filtrar"
        ref={inputRef}
        role={options ? "combobox" : undefined}
        value={value}
      />
      {value ? (
        <button
          aria-label={`Limpiar filtro ${label}`}
          className="absolute inset-y-0 right-1 flex items-center text-muted-foreground hover:text-foreground"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          type="button"
        >
          <X className="size-3" />
        </button>
      ) : options ? (
        <ChevronDown className="pointer-events-none absolute inset-y-0 right-1 my-auto size-3 text-muted-foreground" />
      ) : null}
      {listOpen && typeof document !== "undefined"
        ? createPortal(
            <ul
              className="nm-scroll fixed z-[80] overflow-auto rounded-[var(--radius-md)] border border-border bg-card py-1 shadow-[var(--shadow-md)]"
              id={listId}
              ref={listRef}
              role="listbox"
              style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            >
              {shown.map((option, index) => {
                const active = foldSearch(option) === foldSearch(value.trim());
                return (
                  <li key={option}>
                    <button
                      aria-selected={active}
                      className={cn(
                        "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-muted",
                        index === highlight && "bg-muted",
                      )}
                      onClick={() => pick(option)}
                      onMouseEnter={() => setHighlight(index)}
                      role="option"
                      title={option}
                      type="button"
                    >
                      <Check className={cn("size-3 shrink-0 text-led", active ? "opacity-100" : "opacity-0")} />
                      <span className="min-w-0 truncate">{option}</span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

function shortDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y.slice(2)}` : iso;
}

function DateRangeFilter({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const { from, to } = parseDateRange(value);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 240;
      setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) });
    };
    place();
    const onDoc = (e: globalThis.MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function update(next: { from: string; to: string }) {
    onChange(next.from || next.to ? `${next.from}|${next.to}` : "");
  }

  const summary =
    from && to ? `${shortDate(from)}–${shortDate(to)}` : from ? `≥ ${shortDate(from)}` : to ? `≤ ${shortDate(to)}` : "";

  return (
    <>
      <button
        aria-label={`Filtrar ${label}`}
        className={cn(filterInputClass, "inline-flex items-center gap-1 text-left", !summary && "text-muted-foreground/70")}
        onClick={() => setOpen((v) => !v)}
        onPointerDown={(e) => e.stopPropagation()}
        ref={buttonRef}
        title={summary || undefined}
        type="button"
      >
        <CalendarDays className="size-3 shrink-0" />
        <span className="truncate">{summary || "Fechas"}</span>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[80] flex w-60 flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-card p-3 text-xs shadow-[var(--shadow-md)]"
              ref={panelRef}
              style={{ top: pos.top, left: pos.left }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Desde</span>
                <input
                  className={filterInputClass}
                  max={to || undefined}
                  onChange={(e) => update({ from: e.target.value, to })}
                  type="date"
                  value={from}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground">Hasta</span>
                <input
                  className={filterInputClass}
                  min={from || undefined}
                  onChange={(e) => update({ from, to: e.target.value })}
                  type="date"
                  value={to}
                />
              </label>
              {summary ? (
                <Button onClick={() => update({ from: "", to: "" })} size="sm" type="button" variant="ghost">
                  <X className="size-3.5" />
                  Limpiar fechas
                </Button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
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

const PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

const filterInputClass =
  "h-7 w-full min-w-[4.5rem] rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary";

export function ErpDataTable<T>({
  actions,
  columns,
  expandedRow,
  fill = "page",
  rowClassName,
  rowKey,
  rows,
  storageKey,
  toolbar,
}: {
  actions?: (row: T) => ReactNode;
  columns: ErpTableColumn<T>[];
  /** Contenido de una fila extra a lo ancho debajo de la fila; null = cerrada. */
  expandedRow?: (row: T) => ReactNode;
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
  const groupHeadRef = useRef<HTMLTableCellElement | null>(null);
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [headTops, setHeadTops] = useState({ label: 0, filter: 0 });
  const [query, setQuery] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const optionsById = useMemo(() => {
    if (!showFilters) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const col of columns) {
      const options = filterOptions(col, rows);
      if (options) map.set(col.id, options);
    }
    return map;
  }, [columns, rows, showFilters]);

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
      const label = groupHeadRef.current?.getBoundingClientRect().height ?? 0;
      const labelHeight = Math.max(0, ...[...headRefs.current.values()].map((el) => el.getBoundingClientRect().height));
      const filter = label + labelHeight;
      setHeadTops((prev) => (prev.label === label && prev.filter === filter ? prev : { label, filter }));
    }
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of headRefs.current.values()) ro.observe(el);
    if (actionsRef.current) ro.observe(actionsRef.current);
    if (groupHeadRef.current) ro.observe(groupHeadRef.current);
    return () => ro.disconnect();
  }, [endIds, hasGroups, layoutKey, showFilters, startIds]);

  const filtered = useMemo(() => {
    const q = foldSearch(query.trim());
    const activeCols = Object.entries(colFilters).filter(([, v]) => v.trim());
    if (!q && activeCols.length === 0) return rows;
    return rows.filter((row) => {
      if (q) {
        const hit = visible.some((col) => columnRowText(col, row).includes(q));
        if (!hit) return false;
      }
      return activeCols.every(([id, raw]) => {
        const col = byId.get(id);
        if (!col?.value && !col?.filterText) return true;
        if (col.filter === "date") return matchesDateRange(col.value?.(row), raw);
        return columnRowText(col, row).includes(foldSearch(raw.trim()));
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

  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const pageKey = `${query}|${JSON.stringify(colFilters)}|${prefs.sort?.id}:${prefs.sort?.dir}|${pageSize}`;
  const [pager, setPager] = useState({ key: pageKey, page: 1 });
  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const page = Math.min(pager.key === pageKey ? pager.page : 1, pageCount);
  const pageRows = pageSize ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;
  const pageFrom = sorted.length ? (pageSize ? (page - 1) * pageSize + 1 : 1) : 0;
  const pageTo = pageFrom ? pageFrom + pageRows.length - 1 : 0;

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

  function openRowEdit(e: MouseEvent<HTMLTableRowElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, label, [role=button], [role=combobox]")) return;
    if (window.getSelection()?.toString()) return;
    e.currentTarget.querySelector<HTMLAnchorElement>("[data-row-edit]")?.click();
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
                      ref={i === 0 ? groupHeadRef : undefined}
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
                    className={col.headClass}
                    stickyTop={hasGroups ? headTops.label : undefined}
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
                      className={cn("border-t-0 py-1 font-normal", col.headClass)}
                      key={`filter-${col.id}`}
                      style={{ top: headTops.filter }}
                      {...pinProps(col.id)}
                    >
                      {col.filter === "date" ? (
                        <DateRangeFilter
                          label={col.label}
                          onChange={(next) => setColFilters((prev) => ({ ...prev, [col.id]: next }))}
                          value={colFilters[col.id] ?? ""}
                        />
                      ) : col.value || col.filterText ? (
                        <FilterCombobox
                          label={col.label}
                          onChange={(next) => setColFilters((prev) => ({ ...prev, [col.id]: next }))}
                          options={optionsById.get(col.id)}
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
              {pageRows.map((row) => {
                const expanded = expandedRow?.(row);
                return (
                  <Fragment key={rowKey(row)}>
                    <TR
                      className={cn("group has-[[data-row-edit]]:cursor-pointer has-[[data-row-edit]_.animate-spin]:bg-primary-subtle", rowClassName?.(row))}
                      onClick={openRowEdit}
                    >
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
                    {expanded ? (
                      <TR className="hover:bg-transparent">
                        <TD
                          className="bg-muted/30 p-0 whitespace-normal"
                          colSpan={visible.length + (hasActions ? 1 : 0)}
                        >
                          {expanded}
                        </TD>
                      </TR>
                    ) : null}
                  </Fragment>
                );
              })}
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
      {sorted.length > PAGE_SIZES[0] ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              {pageFrom}–{pageTo} de {sorted.length}
            </span>
            <Select
              aria-label="Filas por página"
              className="h-8 w-auto py-1 text-xs"
              compact
              onChange={(e) => setPageSize(Number(e.target.value))}
              value={pageSize}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} por página
                </option>
              ))}
              <option value={0}>Todas</option>
            </Select>
          </div>
          <Pagination onPageChange={(p) => setPager({ key: pageKey, page: p })} page={page} pageCount={pageCount} />
        </div>
      ) : null}
    </div>
  );
}
