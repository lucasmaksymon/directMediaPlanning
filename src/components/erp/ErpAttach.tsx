"use client";

import { useState } from "react";
import { generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { Input } from "@/components/ui";

const UploadDropzone = generateUploadDropzone<OurFileRouter>();

export function ErpAttach({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");

  return (
    <div className="space-y-2">
      <input name={name} type="hidden" value={url} />
      <Input
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Pegá una URL o subí el scan"
        value={url}
      />
      {url ? (
        <a className="text-xs font-semibold text-led hover:underline" href={url} rel="noreferrer" target="_blank">
          Ver adjunto
        </a>
      ) : null}
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
  );
}
