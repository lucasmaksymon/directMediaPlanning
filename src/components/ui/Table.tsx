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
};

const pinStart =
  "sticky left-0 z-30 border-r border-border !bg-card group-hover:!bg-muted/40";
const pinEnd = "sticky right-0 z-30 border-l border-border !bg-card group-hover:!bg-muted/40";
const pinStartHead = "sticky top-0 left-0 z-40 border-r border-border !bg-card";
const pinEndHead = "sticky top-0 right-0 z-50 border-l border-border !bg-card text-foreground";
const pinStartEdge = "shadow-[8px_0_16px_-10px_rgba(0,0,0,0.45)]";
const pinEndEdge = "shadow-[-8px_0_16px_-10px_rgba(0,0,0,0.45)]";

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
        className={cn("w-full min-w-max border-separate border-spacing-0 text-xs", className)}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-card text-left", className)} {...props} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-divide", className)} {...props} />;
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
        "sticky top-0 z-20 whitespace-nowrap bg-card px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
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
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & PinProps) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-2 py-1.5 text-foreground",
        pin === "start" && pinStart,
        pin === "end" && pinEnd,
        pin === "start" && pinEdge && pinStartEdge,
        pin === "end" && pinEdge && pinEndEdge,
        className,
      )}
      style={pinStyle(pin, pinOffset, style)}
      {...props}
    />
  );
}
