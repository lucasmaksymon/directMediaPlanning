import Link from "next/link";
import { pageScroll, panelPage, surfaceCard } from "@/lib/ui-classes";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/Patterns";

export function PaymentReturn({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: "success" | "warning" | "error";
}) {
  const border =
    tone === "success" ? "border-led/40" : "border-signal/40";
  return (
    <div className={cn(panelPage, pageScroll)}>
      <PageHeader title={title} />
      <div className={cn(surfaceCard(), "max-w-lg space-y-4 p-6", border)}>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Link className="text-sm font-semibold text-foreground underline" href="/advertiser">
          Volver a mis solicitudes
        </Link>
      </div>
    </div>
  );
}
