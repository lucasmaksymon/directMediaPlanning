import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-led">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="nm-page-title">{title}</h1>
        {description ? <div className="nm-secondary max-w-2xl">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="nm-section-title">{title}</h2>
        {description ? <p className="nm-caption mt-1">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function FilterBar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-3 sm:p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-dashed border-border bg-card/60 px-6 py-10",
        className,
      )}
    >
      <h3 className="nm-card-title">{title}</h3>
      {description ? <p className="nm-secondary max-w-md">{description}</p> : null}
      {actionLabel && actionHref ? (
        <Link
          className={cn(
            "inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] border border-primary/40 bg-transparent px-3 text-xs font-medium hover:bg-primary-subtle",
          )}
          href={actionHref}
        >
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} size="sm" variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
      {label}
    </div>
  );
}

export function ErrorState({
  title = "Algo salió mal",
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-error/30 bg-[var(--error-subtle)] px-5 py-6",
        className,
      )}
      role="alert"
    >
      <h3 className="nm-card-title">{title}</h3>
      {description ? <p className="nm-secondary mt-1">{description}</p> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-[var(--radius-md)] bg-muted", className)}
    />
  );
}

/** Compact KPI — not an oversized card mosaic tile. */
export function Stat({
  label,
  value,
  hint,
  accent,
  urgent,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
  urgent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3",
        className,
      )}
    >
      <p className="nm-caption font-medium uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
          urgent && "text-warning",
          accent && !urgent && "text-led",
          !accent && !urgent && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="nm-caption mt-1">{hint}</p> : null}
    </div>
  );
}

export function StatRow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", className)}>
      {children}
    </div>
  );
}

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="nm-caption flex flex-wrap items-center gap-1.5">
      {items.map((item, i) => (
        <span className="inline-flex items-center gap-1.5" key={`${item.label}-${i}`}>
          {i > 0 ? <span aria-hidden className="text-muted-foreground/60">/</span> : null}
          {item.href ? (
            <Link className="hover:text-foreground" href={item.href}>
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        size="sm"
        variant="outline"
      >
        Anterior
      </Button>
      <span className="nm-caption tabular-nums">
        {page} / {pageCount}
      </span>
      <Button
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        size="sm"
        variant="outline"
      >
        Siguiente
      </Button>
    </div>
  );
}
