"use client";

import { useState } from "react";
import { generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import Image from "next/image";
import { cn } from "@/lib/cn";

const UploadDropzone = generateUploadDropzone<OurFileRouter>();

type Props = {
  initialUrls?: string[];
  onChange: (urls: string[]) => void;
};

export function ImageUploader({ initialUrls = [], onChange }: Props) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addUrls(newUrls: string[]) {
    const merged = [...urls, ...newUrls].slice(0, 6);
    setUrls(merged);
    onChange(merged);
  }

  function removeUrl(url: string) {
    const next = urls.filter((u) => u !== url);
    setUrls(next);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Previews */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <div key={url} className="group relative h-20 w-28 overflow-hidden rounded-xl border border-border">
              <Image src={url} alt="foto unidad" fill className="object-cover" unoptimized />
              <button
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100 text-white text-xs font-bold"
                onClick={() => removeUrl(url)}
                type="button"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      {urls.length < 6 && (
        <UploadDropzone
          endpoint="inventoryImage"
          onUploadBegin={() => { setUploading(true); setError(null); }}
          onClientUploadComplete={(res) => {
            setUploading(false);
            addUrls(res.map((r) => r.ufsUrl));
          }}
          onUploadError={(err) => { setUploading(false); setError(err.message); }}
          appearance={{
            container: cn(
              "border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-led/50 transition",
              uploading && "opacity-60 pointer-events-none",
            ),
            uploadIcon: "hidden",
            label: "text-sm text-muted-foreground",
            allowedContent: "text-xs text-muted-foreground",
            button: "hidden",
          }}
        />
      )}
      {error && <p className="text-xs text-signal" role="alert">{error}</p>}
      <p className="text-xs text-muted-foreground">Hasta 6 imágenes, máx. 8MB cada una. Se muestran en el catálogo público.</p>
    </div>
  );
}
