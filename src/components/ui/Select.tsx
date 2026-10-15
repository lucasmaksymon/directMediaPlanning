"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldBase } from "@/lib/ui-variants";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  compact?: boolean;
  invalid?: boolean;
};

type Option = { value: string; label: ReactNode; text: string; disabled: boolean };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function collectOptions(children: ReactNode, out: Option[] = []): Option[] {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode; value?: unknown; disabled?: boolean }>(child)) return;
    if (child.type === Fragment) {
      collectOptions(child.props.children, out);
      return;
    }
    if (child.type !== "option") return;
    const text = textOf(child.props.children);
    out.push({
      value: child.props.value == null ? text : String(child.props.value),
      label: child.props.children,
      text,
      disabled: Boolean(child.props.disabled),
    });
  });
  return out;
}

/**
 * Select con lista propia (la nativa la dibuja el sistema operativo y no se puede estilar).
 * Debajo queda un <select> nativo oculto: lleva name, required, value y onChange, así los
 * formularios, la validación y los listeners de "change" siguen funcionando igual.
 */
export function Select({
  className,
  compact,
  invalid,
  children,
  value,
  defaultValue,
  disabled,
  id,
  ...rest
}: SelectProps) {
  const options = collectOptions(children);
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [inner, setInner] = useState(() =>
    defaultValue != null ? String(defaultValue) : (options.find((o) => !o.disabled)?.value ?? ""),
  );
  const current = value !== undefined ? String(value) : inner;
  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0, maxHeight: 256 });
  const typeahead = useRef({ text: "", at: 0 });

  const pick = useCallback(
    (next: string) => {
      setOpen(false);
      triggerRef.current?.focus();
      const el = selectRef.current;
      if (!el || next === current) return;
      if (value === undefined) setInner(next);
      el.value = next;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [current, value],
  );

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const maxHeight = Math.min(288, Math.max(spaceBelow, spaceAbove, 120));
    const wanted = Math.min(maxHeight, options.length * 34 + 8);
    const placeAbove = spaceBelow < wanted && spaceAbove > spaceBelow;
    setPos({
      top: placeAbove ? rect.top - Math.min(wanted, maxHeight) - 4 : rect.bottom + 4,
      left: rect.left,
      minWidth: rect.width,
      maxHeight,
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (document.getElementById(listId)?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (document.getElementById(listId)?.contains(e.target as Node)) return;
      updatePos();
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [listId, open, updatePos]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${highlight}`)?.scrollIntoView({ block: "nearest" });
  }, [highlight, listId, open]);

  useEffect(() => {
    const form = selectRef.current?.form;
    if (!form || value !== undefined) return;
    const onReset = () => setTimeout(() => setInner(selectRef.current?.value ?? ""));
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [value]);

  function openList() {
    if (disabled) return;
    setHighlight(Math.max(selectedIndex, 0));
    setOpen(true);
  }

  function move(from: number, step: number) {
    for (let i = from + step; i >= 0 && i < options.length; i += step) {
      if (!options[i].disabled) return i;
    }
    return from;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      setHighlight((i) => move(i, e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Home" || e.key === "End") {
      if (!open) return;
      e.preventDefault();
      setHighlight(e.key === "Home" ? move(-1, 1) : move(options.length, -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) return openList();
      const option = options[highlight];
      if (option && !option.disabled) pick(option.value);
    } else if (e.key === "Escape") {
      if (!open) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      const text = (now - typeahead.current.at < 700 ? typeahead.current.text : "") + e.key.toLowerCase();
      typeahead.current = { text, at: now };
      const hit = options.findIndex((o) => !o.disabled && o.text.toLowerCase().startsWith(text));
      if (hit < 0) return;
      if (open) setHighlight(hit);
      else pick(options[hit].value);
    }
  }

  const isPlaceholder = !selected || selected.value === "";

  return (
    <>
      <select
        {...rest}
        aria-hidden
        className="sr-only"
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        ref={selectRef}
        tabIndex={-1}
        value={value}
      >
        {children}
      </select>
      <button
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          fieldBase,
          "flex items-center justify-between gap-2 text-left hover:border-primary/45",
          compact && "min-h-9 py-2 text-[0.8125rem]",
          invalid && "border-error focus:border-error focus:ring-[var(--error-subtle)]",
          className,
        )}
        disabled={disabled}
        id={id}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        ref={triggerRef}
        type="button"
      >
        <span className={cn("min-w-0 truncate", isPlaceholder && "text-muted-foreground")}>
          {selected?.label ?? "\u00a0"}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-led transition-transform", open && "rotate-180")} />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <ul
              className="nm-scroll fixed z-[80] overflow-auto rounded-[var(--radius-md)] border border-border bg-card py-1 shadow-[var(--shadow-md)]"
              id={listId}
              role="listbox"
              style={{ top: pos.top, left: pos.left, minWidth: pos.minWidth, maxHeight: pos.maxHeight }}
            >
              {options.map((option, index) => {
                const active = option.value === current;
                return (
                  <li
                    aria-disabled={option.disabled || undefined}
                    aria-selected={active}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-1.5 text-sm",
                      index === highlight && "bg-muted",
                      active ? "text-foreground" : "text-foreground/85",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                    id={`${listId}-${index}`}
                    key={`${option.value}::${index}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => !option.disabled && pick(option.value)}
                    onMouseEnter={() => setHighlight(index)}
                    role="option"
                  >
                    <Check className={cn("size-3.5 shrink-0 text-led", active ? "opacity-100" : "opacity-0")} />
                    <span className={cn(option.value === "" && "text-muted-foreground")}>{option.label}</span>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </>
  );
}
