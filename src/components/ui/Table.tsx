import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { tableScroll } from "@/lib/ui-classes";

type PinSide = "start" | "end";

type PinProps = {
  pin?: PinSide;
  pinEdge?: boolean;
  pinOffset?: number;
  foot?: boolean;
};

/* cn no resuelve conflictos de clases: cada celda recibe una sola clase z-*. */
const pinStart = "sticky left-0 border-r border-border !bg-card group-hover:!bg-muted/40";
const pinEnd = "sticky right-0 border-l border-border !bg-card group-hover:!bg-muted/40";
const pinStartHead = "left-0 border-r border-border !bg-card";
const pinEndHead = "right-0 border-l border-border !bg-card text-foreground";
const footBg = "!bg-[color-mix(in_srgb,var(--card)_88%,var(--foreground)_12%)]";
const pinStartFoot = "left-0 border-r border-border";
const pinEndFoot = "right-0 border-l border-border";
const pinStartEdge = "shadow-[8px_0_16px_-10px_rgba(0,0,0,0.45)]";
const pinEndEdge = "shadow-[-8px_0_16px_-10px_rgba(0,0,0,0.45)]";
const footCell = cn("sticky bottom-0 border-t border-border font-semibold", footBg);
const footShadow = "shadow-[0_-8px_16px_-10px_rgba(0,0,0,0.45)]";

function headZ(pin: PinSide | undefined) {
  if (pin === "end") return "z-50";
  if (pin === "start") return "z-40";
  return "z-20";
}

function cellZ(pin: PinSide | undefined, foot: boolean | undefined) {
  if (foot) return pin === "end" ? "z-40" : pin === "start" ? "z-[35]" : "z-[25]";
  return pin ? "z-30" : undefined;
}

function pinStyle(pin: PinSide | undefined, offset: number | undefined, style?: CSSProperties) {
  const next = { ...style };
  if (pin === "start" && offset != null) next.left = offset;
  if (pin === "end" && offset != null) next.right = offset;
  return next;
}

export function Table({
  className,
  fill = true,
  ...props
}: HTMLAttributes<HTMLTableElement> & { fill?: boolean | "page" }) {
  return (
    <div
      className={cn(
        tableScroll,
        "rounded-[var(--radius-lg)] border border-border",
        fill === "page" && "min-h-0 flex-1",
        fill === true && "min-h-0 min-h-[18rem] max-h-[70vh] flex-1",
      )}
    >
      <table
        className={cn("w-full min-w-max border-separate border-spacing-0 text-xs leading-snug", className)}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-card text-left", className)} {...props} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-divide [&_tr:nth-child(even)]:bg-muted/15", className)} {...props} />
  );
}

export function TFoot({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={cn(className)} {...props} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition-colors hover:bg-muted/40", className)} {...props} />
  );
}

export const TH = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement> & PinProps
>(function TH({ className, pin, pinEdge, pinOffset, style, ...props }, ref) {
  return (
    <th
      className={cn(
        "sticky top-0 whitespace-nowrap border-b border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80",
        headZ(pin),
        pin === "start" && pinStartHead,
        pin === "end" && pinEndHead,
        pin === "start" && pinEdge && pinStartEdge,
        pin === "end" && pinEdge && pinEndEdge,
        className,
      )}
      ref={ref}
      style={pinStyle(pin, pinOffset, style)}
      {...props}
    />
  );
});

export function TD({
  className,
  pin,
  pinEdge,
  pinOffset,
  style,
  foot,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & PinProps) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-2.5 py-1.5 text-foreground",
        foot && footCell,
        cellZ(pin, foot),
        pin === "start" && (foot ? pinStartFoot : pinStart),
        pin === "end" && (foot ? pinEndFoot : pinEnd),
        pin === "start" && pinEdge && pinStartEdge,
        pin === "end" && pinEdge && pinEndEdge,
        foot && !(pin && pinEdge) && footShadow,
        className,
      )}
      style={pinStyle(pin, pinOffset, style)}
      {...props}
    />
  );
}
