"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";

export type ErpLineField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date";
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export type ErpLineRow = {
  id?: string;
  values: Record<string, string>;
};

function emptyValues(fields: ErpLineField[]) {
  return Object.fromEntries(fields.map((f) => [f.name, ""]));
}

let lineKey = 0;
function nextKey() {
  lineKey += 1;
  return `line-${lineKey}`;
}

export function ErpLineList({
  prefix,
  title,
  fields,
  rows = [],
  addLabel = "Agregar línea",
  className,
}: {
  prefix: string;
  title: string;
  fields: ErpLineField[];
  rows?: ErpLineRow[];
  addLabel?: string;
  className?: string;
}) {
  const [lines, setLines] = useState(() => {
    const initial = rows.length
      ? rows.map((row) => ({ key: nextKey(), id: row.id ?? "", values: { ...emptyValues(fields), ...row.values } }))
      : [{ key: nextKey(), id: "", values: emptyValues(fields) }];
    return initial;
  });

  return (
    <div className={cn("sm:col-span-2 xl:col-span-4 space-y-2 pt-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <Button
          onClick={() => setLines((prev) => [...prev, { key: nextKey(), id: "", values: emptyValues(fields) }])}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      </div>
      <div className="space-y-2">
        {lines.map((line) => (
          <div
            className="grid items-end gap-2 rounded-md border border-border/70 bg-background/40 p-2 sm:grid-cols-2 lg:grid-cols-4"
            key={line.key}
          >
            <input name={`${prefix}.id`} type="hidden" value={line.id} />
            {fields.map((field) => (
              <label className="min-w-0 space-y-1" key={field.name}>
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                  {field.label}
                </span>
                {field.options ? (
                  <Select defaultValue={line.values[field.name] ?? ""} name={`${prefix}.${field.name}`}>
                    <option value="">Seleccioná</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    defaultValue={line.values[field.name] ?? ""}
                    name={`${prefix}.${field.name}`}
                    placeholder={field.placeholder}
                    type={field.type === "date" ? "date" : "text"}
                    inputMode={field.type === "number" ? "decimal" : undefined}
                  />
                )}
              </label>
            ))}
            <div className="flex justify-end xl:col-span-1">
              <IconButton
                disabled={lines.length <= 1}
                label="Quitar línea"
                onClick={() => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== line.key)))}
                size="icon-sm"
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
