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
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { TableColumnsMenu } from "@/components/erp/TableColumnsMenu";
import { cn } from "@/lib/cn";
import { compareTableValues, useTablePrefs, type TablePin } from "@/lib/table-prefs";

export type ErpTableColumn<T> = {
  id: string;
  label: string;
  group?: string;
  align?: "left" | "right";
  headClass?: string;
  cellClass?: string;
  value?: (row: T) => string | number | null | undefined;
  cell: (row: T) => ReactNode;
  foot?: (rows: T[]) => ReactNode;
};

function SortableHead({
  children,
  className,
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
          "inline-flex w-full items-center gap-1 uppercase tracking-wide",
          right && "justify-end",
        )}
        onClick={() => onSort(id)}
        type="button"
      >
        {children}
        {active ? (
          sort?.dir === "asc" ? (
            <ArrowUp className="size-3 shrink-0" />
          ) : (
            <ArrowDown className="size-3 shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="size-3 shrink-0 opacity-40" />
        )}
      </button>
    </TH>
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

export function ErpDataTable<T>({
  actions,
  columns,
  fill = true,
  rowClassName,
  rowKey,
  rows,
  storageKey,
}: {
  actions?: (row: T) => ReactNode;
  columns: ErpTableColumn<T>[];
  fill?: boolean | "page";
  rowClassName?: (row: T) => string | undefined;
  rowKey: (row: T) => string;
  rows: T[];
  storageKey: string;
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

  const sorted = useMemo(() => {
    if (!prefs.sort) return rows;
    const col = byId.get(prefs.sort.id);
    if (!col?.value) return rows;
    const dir = prefs.sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compareTableValues(col.value?.(a), col.value?.(b)) * dir);
  }, [byId, prefs.sort, rows]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 justify-end">
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
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
        <SortableContext items={visible.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <Table fill={fill}>
            <THead>
              {hasGroups ? (
                <TR className="hover:bg-transparent">
                  {spans.map((span, i) => (
                    <TH
                      className={cn(
                        "py-1 leading-none text-foreground",
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
                    <TH pin="end" pinEdge={endIds.length === 0} ref={actionsRef} rowSpan={2}>
                      Acciones
                    </TH>
                  ) : null}
                </TR>
              ) : null}
              <TR className="hover:bg-transparent">
                {visible.map((col) => (
                  <SortableHead
                    className={cn(hasGroups && "top-5 py-1", col.headClass)}
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
                  <TH pin="end" pinEdge={endIds.length === 0} ref={actionsRef}>
                    Acciones
                  </TH>
                ) : null}
              </TR>
            </THead>
            <TBody>
              {sorted.map((row) => (
                <TR className={cn("group", rowClassName?.(row))} key={rowKey(row)}>
                  {visible.map((col) => (
                    <TD
                      className={cn(col.align === "right" && "text-right tabular-nums", col.cellClass)}
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
              {hasFooter ? (
                <TR className="bg-muted/50 font-semibold hover:bg-muted/50">
                  {visible.map((col) => (
                    <TD
                      className={cn(col.align === "right" && "text-right tabular-nums", col.cellClass)}
                      key={col.id}
                      {...pinProps(col.id)}
                    >
                      {col.foot?.(sorted)}
                    </TD>
                  ))}
                  {hasActions ? <TD pin="end" pinEdge={endIds.length === 0} /> : null}
                </TR>
              ) : null}
            </TBody>
          </Table>
        </SortableContext>
      </DndContext>
    </div>
  );
}
