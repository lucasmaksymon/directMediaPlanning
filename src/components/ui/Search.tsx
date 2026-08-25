import { Search as SearchIcon } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldBase } from "@/lib/ui-variants";

export type SearchProps = InputHTMLAttributes<HTMLInputElement>;

export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search(
  { className, ...props },
  ref,
) {
  return (
    <div className="relative">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        className={cn(fieldBase, "pl-9", className)}
        ref={ref}
        type="search"
        {...props}
      />
    </div>
  );
});
