"use client";

import { Check, ChevronDown, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { fieldBase } from "@/lib/ui-variants";

export type AutocompleteOption = { value: string; label: string };

type AutocompleteBase = {
  id?: string;
  name?: string;
  options: AutocompleteOption[];
  placeholder?: string;
  emptyLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  compact?: boolean;
};

export type AutocompleteProps =
  | (AutocompleteBase & {
      multiple?: false;
      defaultValue?: string;
      value?: string;
      onChange?: (value: string) => void;
    })
  | (AutocompleteBase & {
      multiple: true;
      defaultValue?: string[];
      value?: string[];
      onChange?: (value: string[]) => void;
    });

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function selectedValues(props: AutocompleteProps, inner: string | string[]) {
  if (props.multiple) {
    const current = (props.value !== undefined ? props.value : inner) as string[];
    return current ?? [];
  }
  const current = (props.value !== undefined ? props.value : inner) as string;
  return current ? [current] : [];
}

export function Autocomplete(props: AutocompleteProps) {
  const {
    id,
    name,
    options,
    placeholder = "Buscar…",
    emptyLabel = "Seleccioná",
    required,
    disabled,
    className,
    invalid,
    compact,
  } = props;
  const multiple = props.multiple === true;
  const generatedId = useId();
  const listId = `${id ?? generatedId}-list`;
  const inputId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 256 });
  const [inner, setInner] = useState<string | string[]>(
    multiple ? (props.defaultValue ?? []) : (props.defaultValue ?? ""),
  );
  const values = selectedValues(props, inner);
  const selectedSet = useMemo(() => new Set(values), [values]);
  const labelByValue = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return options;
    return options.filter((o) => fold(o.label).includes(q) || fold(o.value).includes(q));
  }, [options, query]);

  const commit = useCallback(
    (next: string | string[]) => {
      if (props.value === undefined) setInner(next);
      if (props.multiple) props.onChange?.(next as string[]);
      else props.onChange?.(next as string);
    },
    [props],
  );

  const pick = useCallback(
    (value: string) => {
      if (multiple) {
        const next = selectedSet.has(value)
          ? values.filter((v) => v !== value)
          : [...values, value];
        commit(next);
        setQuery("");
        inputRef.current?.focus();
        return;
      }
      commit(value);
      setQuery("");
      setOpen(false);
    },
    [commit, multiple, selectedSet, values],
  );

  const clear = useCallback(() => {
    commit(multiple ? [] : "");
    setQuery("");
    inputRef.current?.focus();
  }, [commit, multiple]);

  const updatePos = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const maxHeight = Math.min(256, Math.max(spaceBelow, spaceAbove, 120));
    const placeAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
    setPos({
      top: placeAbove ? rect.top - maxHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
  }, [open, filtered.length, values.length, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePos();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const list = document.getElementById(listId);
      if (list?.contains(target)) return;
      setOpen(false);
      setQuery("");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [listId, open]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      if (props.value === undefined) {
        setInner(multiple ? (props.defaultValue ?? []) : (props.defaultValue ?? ""));
      }
      setQuery("");
      setOpen(false);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [multiple, props.defaultValue, props.value]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const display =
    open || query
      ? query
      : multiple
        ? ""
        : (labelByValue.get(values[0] ?? "") ?? "");
  const hasValue = values.length > 0;

  return (
    <div className={cn("nm-autocomplete relative", className)} ref={rootRef}>
      {name
        ? multiple
          ? values.map((value) => <input key={value} name={name} type="hidden" value={value} />)
          : <input name={name} type="hidden" value={values[0] ?? ""} />
        : null}
      {required ? (
        <input
          aria-hidden
          className="sr-only"
          onChange={() => undefined}
          required={!hasValue}
          tabIndex={-1}
          value={hasValue ? "1" : ""}
        />
      ) : null}
      {multiple && hasValue ? (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {values.map((value) => (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground"
              key={value}
            >
              <span className="truncate">{labelByValue.get(value) ?? value}</span>
              <button
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                onClick={() => pick(value)}
                type="button"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
          className={cn(
            fieldBase,
            "nm-autocomplete-input pr-16",
            compact && "min-h-8 py-1.5 text-xs",
            invalid && "border-error focus:border-error focus:ring-[var(--error-subtle)]",
          )}
          disabled={disabled}
          id={inputId}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            if (!multiple && !query) inputRef.current?.select();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              const option = filtered[highlight];
              if (open && option) {
                e.preventDefault();
                pick(option.value);
              }
            } else if (e.key === "Backspace" && !query && multiple && values.length) {
              pick(values[values.length - 1]);
            }
          }}
          placeholder={hasValue && !multiple ? emptyLabel : placeholder}
          ref={inputRef}
          role="combobox"
          type="text"
          value={display}
        />
        <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center gap-0.5">
          {hasValue && !disabled ? (
            <button
              className="pointer-events-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={clear}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
          <ChevronDown className={cn("size-4 text-led", open && "rotate-180")} />
        </div>
      </div>
      {open && typeof document !== "undefined"
        ? createPortal(
            <ul
              className="nm-scroll fixed z-[80] overflow-auto rounded-[var(--radius-md)] border border-border bg-card py-1 shadow-[var(--shadow-md)]"
              id={listId}
              role="listbox"
              style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            >
              {!required ? (
                <li>
                  <button
                    className="flex w-full items-center px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
                    onClick={() => {
                      commit(multiple ? [] : "");
                      setQuery("");
                      setOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    {emptyLabel}
                  </button>
                </li>
              ) : null}
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
              ) : (
                filtered.map((option, index) => {
                  const active = selectedSet.has(option.value);
                  return (
                    <li key={option.value}>
                      <button
                        aria-selected={active}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted",
                          index === highlight && "bg-muted",
                          active && "text-foreground",
                        )}
                        onMouseEnter={() => setHighlight(index)}
                        onClick={() => pick(option.value)}
                        role="option"
                        type="button"
                      >
                        <Check className={cn("size-3.5 shrink-0", active ? "opacity-100" : "opacity-0")} />
                        <span className="min-w-0 truncate">{option.label}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
