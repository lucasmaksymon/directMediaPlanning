"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { FileSpreadsheet, ScanSearch } from "lucide-react";
import { cn } from "@/lib/cn";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function isOcrFile(file: File) {
  return file.type === "application/pdf" || file.type.startsWith("image/") || /\.(pdf|png|jpe?g|webp|gif)$/i.test(file.name);
}

function isExcelFile(file: File) {
  return file.type === XLSX_MIME || /\.xlsx$/i.test(file.name);
}

function takeFiles(list: FileList | File[] | null, multiple: boolean, accepts: (file: File) => boolean) {
  const files = Array.from(list ?? []).filter(accepts);
  return multiple ? files : files.slice(0, 1);
}

export function ErpOcrDropzone({
  multiple,
  disabled,
  label,
  hint,
  fileKind = "ocr",
  onFiles,
}: {
  multiple?: boolean;
  disabled?: boolean;
  label: string;
  hint?: ReactNode;
  fileKind?: "ocr" | "excel";
  onFiles: (files: File[]) => void;
}) {
  const accepts = fileKind === "excel" ? isExcelFile : isOcrFile;
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    if (disabled) return;
    const files = takeFiles(e.dataTransfer.files, Boolean(multiple), accepts);
    if (files.length) onFiles(files);
  }

  return (
    <div
      className={cn(
        "rounded-md border border-dashed px-3 py-3 transition",
        over ? "border-led bg-primary-subtle" : "border-border/80 bg-background/40",
        disabled && "opacity-60",
      )}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input
        accept={fileKind === "excel" ? `.xlsx,${XLSX_MIME}` : "application/pdf,image/*"}
        className="sr-only"
        disabled={disabled}
        form=""
        multiple={multiple}
        onChange={(e) => {
          const files = takeFiles(e.target.files, Boolean(multiple), accepts);
          e.currentTarget.value = "";
          if (files.length) onFiles(files);
        }}
        ref={fileRef}
        type="file"
      />
      <button
        className="flex w-full flex-col items-center gap-1 text-center"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        type="button"
      >
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          {fileKind === "excel" ? <FileSpreadsheet className="size-3.5" /> : <ScanSearch className="size-3.5" />}
          {label}
        </span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </button>
    </div>
  );
}
