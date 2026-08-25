"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

export function ImageGallery({
  images,
  unitName,
  className,
}: {
  images: string[];
  unitName: string;
  className?: string;
}) {
  const valid = images.filter((src) => Boolean(src?.trim()));
  const [active, setActive] = useState(0);

  if (valid.length === 0) return null;

  const safeIndex = Math.min(active, valid.length - 1);

  return (
    <div className={cn("w-full min-w-0 space-y-2", className)}>
      <div className="relative h-56 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-muted sm:h-72 lg:h-[22rem]">
        <Image
          src={valid[safeIndex]}
          alt={`${unitName} — imagen ${safeIndex + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 42vw"
          priority
          unoptimized
        />
      </div>
      {valid.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {valid.map((src, i) => (
            <button
              key={`${src}-${i}`}
              onClick={() => setActive(i)}
              type="button"
              className={cn(
                "relative h-12 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2 transition",
                safeIndex === i ? "border-led" : "border-transparent hover:border-border",
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
