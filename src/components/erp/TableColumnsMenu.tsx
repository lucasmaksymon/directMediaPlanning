"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Columns3, GripVertical, PanelLeft, PanelRight, RotateCcw } from "lucide-react";
import { Button, Checkbox } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { TablePin } from "@/lib/table-prefs";

export type TableColumnOption = {
  id: string;
  label: string;
  group: string;
};

function PinButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded p-0.5 transition-colors",
        active ? "bg-primary-subtle text-led" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function SortableRow({
  col,
  checked,
  onPin,
  onToggle,
  pin,
}: {
  col: TableColumnOption;
  checked: boolean;
  onPin: (side: TablePin | null) => void;
  onToggle: () => void;
  pin: TablePin | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.id,
  });
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1",
        isDragging && "bg-muted",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        aria-label={`Mover ${col.label}`}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={checked} onChange={onToggle} />
        <span className="truncate">{col.label}</span>
      </label>
      <PinButton
        active={pin === "start"}
        label={pin === "start" ? "Quitar fijo izquierda" : "Fijar a la izquierda"}
        onClick={() => onPin(pin === "start" ? null : "start")}
      >
        <PanelLeft className="size-3.5" />
      </PinButton>
      <PinButton
        active={pin === "end"}
        label={pin === "end" ? "Quitar fijo derecha" : "Fijar a la derecha"}
        onClick={() => onPin(pin === "end" ? null : "end")}
      >
        <PanelRight className="size-3.5" />
      </PinButton>
    </div>
  );
}

export function TableColumnsMenu({
  columns,
  hidden,
  onMove,
  onPin,
  onReset,
  onToggle,
  order,
  pinOf,
}: {
  columns: TableColumnOption[];
  hidden: string[];
  onMove: (activeId: string, overId: string) => void;
  onPin: (id: string, side: TablePin | null) => void;
  onReset: () => void;
  onToggle: (id: string) => void;
  order: string[];
  pinOf: (id: string) => TablePin | null;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const byId = new Map(columns.map((c) => [c.id, c]));
  const ordered = order.map((colId) => byId.get(colId)).filter(Boolean) as TableColumnOption[];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";
    if (overId) onMove(activeId, overId);
  }

  let lastGroup = "";

  return (
    <div className="relative" ref={ref}>
      <Button
        aria-controls={id}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        size="sm"
        variant="outline"
      >
        <Columns3 className="size-3.5" />
        Columnas
      </Button>
      {open ? (
        <div
          className="absolute right-0 z-[var(--z-dropdown)] mt-1 flex w-96 max-h-[min(32rem,70vh)] flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-card shadow-[var(--shadow-md)]"
          id={id}
          role="dialog"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mostrar, ordenar y fijar
            </p>
            <button
              className="inline-flex items-center gap-1 text-xs font-medium text-led hover:underline"
              onClick={onReset}
              type="button"
            >
              <RotateCcw className="size-3" />
              Restablecer
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
              <SortableContext items={ordered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-0.5">
                  {ordered.map((col) => {
                    const showGroup = col.group !== lastGroup;
                    lastGroup = col.group;
                    return (
                      <li key={col.id} className="list-none">
                        {showGroup ? (
                          <p className="px-1.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground first:pt-0">
                            {col.group}
                          </p>
                        ) : null}
                        <SortableRow
                          checked={!hidden.includes(col.id)}
                          col={col}
                          onPin={(side) => onPin(col.id, side)}
                          onToggle={() => onToggle(col.id)}
                          pin={pinOf(col.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      ) : null}
    </div>
  );
}
