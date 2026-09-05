"use client";

import { useEffect, useRef, useState } from "react";
import { generateReactHelpers, generateUploadDropzone } from "@uploadthing/react";
import { Paperclip, X } from "lucide-react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { Button, IconButton, Input } from "@/components/ui";

const UploadDropzone = generateUploadDropzone<OurFileRouter>();
const { useUploadThing } = generateReactHelpers<OurFileRouter>();

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
  const fileRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const { startUpload, isUploading } = useUploadThing("erpDocument", {
    onClientUploadComplete: (files) => {
      const next = files[0]?.ufsUrl ?? files[0]?.url;
      if (next) setUrl(next);
    },
  });

  async function onPick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    await startUpload([file]);
    if (fileRef.current) fileRef.current.value = "";
  }

  useEffect(() => {
    const root = dropzoneRef.current;
    if (!root) return;
    for (const input of root.querySelectorAll("input[type=file]")) {
      input.setAttribute("form", "");
    }
  });

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <input name={name} type="hidden" value={url} />
      {compact ? (
        <div className="flex min-w-0 items-center gap-1.5">
          <Input
            className="min-w-0 flex-1"
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL o subí el scan"
            value={url}
          />
          <input
            accept="application/pdf,image/*"
            className="sr-only"
            form=""
            onChange={(e) => void onPick(e.target.files)}
            ref={fileRef}
            type="file"
          />
          <Button
            disabled={isUploading}
            onClick={() => fileRef.current?.click()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Paperclip className="size-3.5" />
            {isUploading ? "Subiendo…" : "Subir"}
          </Button>
          {url ? (
            <>
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
            </>
          ) : null}
        </div>
      ) : (
        <>
          <Input
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pegá una URL o subí el scan"
            value={url}
          />
          {url ? (
            <a className="text-xs font-semibold text-led hover:underline" href={url} rel="noreferrer" target="_blank">
              Ver recibo
            </a>
          ) : null}
          <div ref={dropzoneRef}>
            <UploadDropzone
              appearance={{ container: "ut-compact border-border" }}
              className="ut-label:text-xs ut-allowed-content:text-[10px] ut-button:bg-primary ut-button:text-xs"
              endpoint="erpDocument"
              onClientUploadComplete={(files) => {
                const next = files[0]?.ufsUrl ?? files[0]?.url;
                if (next) setUrl(next);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
