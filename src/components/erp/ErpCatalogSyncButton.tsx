"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type SyncResult = { ok: true; message: string } | { ok: false; error: string };

export function ErpCatalogSyncButton({
  action,
  label = "Sincronizar desde carteles",
}: {
  action: () => Promise<SyncResult>;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        disabled={pending}
        onClick={() => {
          setMsg(null);
          setFailed(false);
          start(async () => {
            const res = await action();
            if (res.ok) {
              setMsg(res.message);
              router.refresh();
            } else {
              setFailed(true);
              setMsg(res.error);
            }
          });
        }}
        size="sm"
        type="button"
        variant="secondary"
      >
        {pending ? "Sincronizando…" : label}
      </Button>
      {msg ? (
        <span className={failed ? "text-xs text-error" : "text-xs text-muted-foreground"}>{msg}</span>
      ) : null}
    </div>
  );
}
