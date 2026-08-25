"use client";

import { X } from "lucide-react";
import {
  useEffect,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Full-screen on small viewports */
  sheetOnMobile?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  sheetOnMobile = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center sm:p-4">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-carbon/50 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[90dvh] w-full flex-col border border-border bg-card shadow-[var(--shadow-md)]",
          sheetOnMobile
            ? "rounded-t-[var(--radius-xl)] sm:max-w-lg sm:rounded-[var(--radius-xl)]"
            : "mx-4 max-w-lg rounded-[var(--radius-xl)]",
          className,
        )}
        role="dialog"
        aria-modal
        aria-label={title}
      >
        {title ? (
          <div className="flex items-center justify-between gap-3 border-b border-divide px-5 py-4">
            <h2 className="nm-section-title">{title}</h2>
            <IconButton label="Cerrar" onClick={onClose} size="icon-sm">
              <X className="size-4" />
            </IconButton>
          </div>
        ) : null}
        <div className="nm-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "left",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)]">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-carbon/40"
        onClick={onClose}
        type="button"
      />
      <aside
        className={cn(
          "absolute top-0 flex h-full w-[min(20rem,88vw)] flex-col border-border bg-card shadow-[var(--shadow-md)]",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className,
        )}
        role="dialog"
        aria-modal
        aria-label={title ?? "Menú"}
      >
        {title ? (
          <div className="flex items-center justify-between gap-3 border-b border-divide px-4 py-3">
            <p className="text-sm font-semibold">{title}</p>
            <IconButton label="Cerrar" onClick={onClose} size="icon-sm">
              <X className="size-4" />
            </IconButton>
          </div>
        ) : null}
        <div className="nm-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

export function Alert({
  variant = "info",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: "info" | "success" | "warning" | "error";
}) {
  const styles = {
    info: "border-[var(--info)]/30 bg-[var(--info-subtle)] text-foreground",
    success: "border-success/30 bg-[var(--success-subtle)] text-foreground",
    warning: "border-warning/30 bg-[var(--warning-subtle)] text-foreground",
    error: "border-error/30 bg-[var(--error-subtle)] text-foreground",
  } as const;
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border px-4 py-3 text-sm",
        styles[variant],
        className,
      )}
      role="alert"
      {...props}
    />
  );
}
