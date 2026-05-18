"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

export function ImageGallery({ images, unitName }: { images: string[]; unitName: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted">
        <Image
          src={images[active]}
          alt={`${unitName} — imagen ${active + 1}`}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              type="button"
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition",
                active === i ? "border-led" : "border-transparent hover:border-border",
              )}
            >
              <Image src={src} alt={`miniatura ${i + 1}`} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
