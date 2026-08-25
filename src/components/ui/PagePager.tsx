import Link from "next/link";
import { buttonVariants } from "@/lib/ui-variants";
import { cn } from "@/lib/cn";

export function PagePager({
  page,
  pageCount,
  total,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  hrefForPage: (p: number) => string;
}) {
  if (pageCount <= 1) {
    return (
      <p className="nm-caption shrink-0 tabular-nums">
        {total} {total === 1 ? "resultado" : "resultados"}
      </p>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <p className="nm-caption tabular-nums">
        Página {page} de {pageCount} · {total} total
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            href={hrefForPage(page - 1)}
          >
            Anterior
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-45",
            )}
          >
            Anterior
          </span>
        )}
        {page < pageCount ? (
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            href={hrefForPage(page + 1)}
          >
            Siguiente
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-45",
            )}
          >
            Siguiente
          </span>
        )}
      </div>
    </div>
  );
}
