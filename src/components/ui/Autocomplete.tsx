"use client";

import { Check, ChevronDown, Plus, X } from "lucide-react";
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
import { filterAutocompleteOptions, isExactAutocompleteMatch } from "@/lib/autocomplete-filter";
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
  /** Permite commitear el texto tipeado cuando no hay coincidencia exacta. */
  creatable?: boolean;
  createLabel?: (query: string) => string;
  /** Texto serializable para Server Components: «Crear plaza "Pilar"». */
  createNoun?: string;
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
    creatable,
    createLabel,
    createNoun,
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

  const filtered = useMemo(() => filterAutocompleteOptions(options, query), [options, query]);
  const queryTrim = query.trim();
  const searching = queryTrim.length > 0;
  const exactMatch = useMemo(() => isExactAutocompleteMatch(options, queryTrim), [options, queryTrim]);
  const canCreate = Boolean(creatable && !multiple && queryTrim && !exactMatch);
  const createIndex = canCreate ? filtered.length : -1;
  const navCount = filtered.length + (canCreate ? 1 : 0);

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

  const selectedLabel = multiple ? "" : (labelByValue.get(values[0] ?? "") ?? values[0] ?? "");
  const display = open ? query : selectedLabel;
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
            "nm-autocomplete-input !px-3.5 !pr-16 truncate",
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
              setHighlight((i) => Math.min(i + 1, Math.max(navCount - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              const option = filtered[highlight];
              if (open && option) {
                e.preventDefault();
                pick(option.value);
              } else if (open && canCreate) {
                e.preventDefault();
                pick(queryTrim);
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
        <div className="pointer-events-none absolute inset-y-px right-px flex items-center gap-0.5 rounded-r-[var(--radius-input)] bg-[var(--input-bg)] pl-1 pr-1.5">
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
              {!required && !searching ? (
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
              {filtered.length === 0 && !canCreate ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
              ) : (
                filtered.map((option, index) => {
                  const active = selectedSet.has(option.value);
                  return (
                    <li key={`${option.value}::${option.label}::${index}`}>
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
              {canCreate ? (
                <li>
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted",
                      highlight === createIndex && "bg-muted",
                    )}
                    onMouseEnter={() => setHighlight(createIndex)}
                    onClick={() => pick(queryTrim)}
                    role="option"
                    type="button"
                  >
                    <Plus className="size-3.5 shrink-0 text-led" />
                    <span className="min-w-0 truncate">
                      {createLabel?.(queryTrim)
                        ?? (createNoun ? `Crear ${createNoun} «${queryTrim}»` : `Crear «${queryTrim}»`)}
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
