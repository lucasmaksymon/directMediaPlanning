"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { btnSecondary } from "@/lib/ui-classes";

export type PresentationMockupStatus = "idle" | "loading" | "ready" | "error";

type Props = {
  creativeUrl: string | null;
  onCreativeUrl: (url: string | null) => void;
  hasPhoto: boolean;
  mockupStatus: PresentationMockupStatus;
  slidesWithPhoto: number;
  generating: boolean;
  onApplyOne: () => void;
  onApplyAll: () => void;
  onRegenerate: () => void;
  onRevert: () => void;
};

export function PresentationCreativeBar({
  creativeUrl,
  onCreativeUrl,
  hasPhoto,
  mockupStatus,
  slidesWithPhoto,
  generating,
  onApplyOne,
  onApplyAll,
  onRegenerate,
  onRevert,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const canApply = Boolean(creativeUrl) && hasPhoto && !generating && !isUploading;

  async function handleFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Elegí una imagen (JPG, PNG o WebP).");
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/presentations/upload-image", {
        method: "POST",
        body,
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo subir la imagen.");
      }
      onCreativeUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="sm:col-span-2 lg:col-span-3 2xl:col-span-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-2 py-1.5">
        <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Arte del cliente
        </span>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={generating || isUploading}
          onChange={(e) => void handleFileChange(e.target.files)}
        />

        {creativeUrl ? (
          <div className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Arte del cliente"
              className="h-9 w-12 rounded-md border border-border object-cover"
              src={creativeUrl}
            />
            <button
              type="button"
              className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              disabled={generating || isUploading}
              onClick={() => inputRef.current?.click()}
            >
              Cambiar
            </button>
            <button
              type="button"
              className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              disabled={generating || isUploading}
              onClick={() => {
                onCreativeUrl(null);
                setUploadError(null);
              }}
            >
              Quitar
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={cn(btnSecondary, "h-7 px-2.5 py-0 text-[11px]")}
            disabled={generating || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Subiendo…" : "Elegir imagen"}
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1">
          {mockupStatus === "ready" ? (
            <span className="rounded-full bg-led/15 px-2 py-0.5 text-[10px] font-semibold text-led">
              Con creativo
            </span>
          ) : null}
          {mockupStatus === "error" ? (
            <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[10px] font-semibold text-signal">
              Error
            </span>
          ) : null}
          {mockupStatus === "ready" || mockupStatus === "error" ? (
            <button
              type="button"
              className={cn(btnSecondary, "h-7 px-2 py-0 text-[11px]")}
              disabled={!canApply}
              onClick={onRegenerate}
            >
              Regenerar
            </button>
          ) : (
            <button
              type="button"
              className={cn(btnSecondary, "h-7 px-2 py-0 text-[11px]")}
              disabled={!canApply}
              onClick={onApplyOne}
            >
              Colocar en este
            </button>
          )}
          {mockupStatus === "ready" ? (
            <button
              type="button"
              className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              disabled={generating}
              onClick={onRevert}
            >
              Volver a original
            </button>
          ) : null}
          {slidesWithPhoto > 1 ? (
            <button
              type="button"
              className={cn(btnSecondary, "h-7 px-2 py-0 text-[11px]")}
              disabled={!creativeUrl || generating || isUploading}
              onClick={onApplyAll}
            >
              Colocar en todos
            </button>
          ) : null}
        </div>
      </div>
      {uploadError ? (
        <p className="mt-1 text-[11px] text-signal" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
