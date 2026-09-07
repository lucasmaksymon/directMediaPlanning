"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { storeErpAttachment } from "@/app/actions/erp-attachment";
import { Button, IconButton } from "@/components/ui";
import { cn } from "@/lib/cn";
import { asOcrFile, attachmentDisplayName } from "@/lib/erp-ocr-file";

export function ErpAttach({
  name,
  defaultValue,
  compact,
}: {
  name: string;
  defaultValue?: string | null;
  compact?: boolean;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(defaultValue ?? "");
  }, [defaultValue]);

  async function onPick(files: FileList | File[] | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", asOcrFile(file));
      const res = await storeErpAttachment(data);
      if (!res.ok) throw new Error(res.error);
      setUrl(res.url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2", compact && "w-full")}>
      <input name={name} type="hidden" value={url} />
      <input
        accept="application/pdf,image/*"
        className="sr-only"
        form=""
        onChange={(e) => void onPick(e.target.files)}
        ref={fileRef}
        type="file"
      />
      {url ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1.5">
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-sm" title={attachmentDisplayName(url)}>
            {attachmentDisplayName(url)}
          </span>
          <a
            className="shrink-0 text-xs font-semibold text-led hover:underline"
            href={url}
            rel="noreferrer"
            target="_blank"
          >
            Ver
          </a>
          <IconButton label="Quitar adjunto" onClick={() => setUrl("")} size="icon-sm">
            <X className="size-3.5" />
          </IconButton>
        </div>
      ) : (
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {uploading ? "Subiendo…" : "Sin adjunto"}
        </p>
      )}
      <Button
        className="shrink-0"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        size="sm"
        type="button"
        variant="outline"
      >
        <Paperclip className="size-3.5" />
        {uploading ? "Subiendo…" : url ? "Cambiar" : "Subir"}
      </Button>
    </div>
  );
}
