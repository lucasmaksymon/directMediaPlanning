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

const pinStart =
  "sticky left-0 z-30 border-r border-border !bg-card group-hover:!bg-muted/40";
const pinEnd = "sticky right-0 z-30 border-l border-border !bg-card group-hover:!bg-muted/40";
const pinStartHead = "sticky top-0 left-0 z-40 border-r border-border !bg-card";
const pinEndHead = "sticky top-0 right-0 z-50 border-l border-border !bg-card text-foreground";
const footBg = "!bg-[color-mix(in_srgb,var(--card)_88%,var(--foreground)_12%)]";
const pinStartFoot = cn("sticky bottom-0 left-0 z-[35] border-r border-t border-border", footBg);
const pinEndFoot = cn("sticky bottom-0 right-0 z-40 border-l border-t border-border", footBg);
const pinStartEdge = "shadow-[8px_0_16px_-10px_rgba(0,0,0,0.45)]";
const pinEndEdge = "shadow-[-8px_0_16px_-10px_rgba(0,0,0,0.45)]";
const footCell = cn(
  "sticky bottom-0 z-[25] border-t border-border font-semibold shadow-[0_-8px_16px_-10px_rgba(0,0,0,0.45)]",
  footBg,
);

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
        "sticky top-0 z-20 whitespace-nowrap border-b border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80",
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
        pin === "start" && (foot ? pinStartFoot : pinStart),
        pin === "end" && (foot ? pinEndFoot : pinEnd),
        pin === "start" && pinEdge && pinStartEdge,
        pin === "end" && pinEdge && pinEndEdge,
        className,
      )}
      style={pinStyle(pin, pinOffset, style)}
      {...props}
    />
  );
}
