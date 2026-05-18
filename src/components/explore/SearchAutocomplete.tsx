"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { normalizeText } from "@/lib/normalize-text";

type Suggestion = { label: string; sublabel?: string; value: string };

type Props = {
  suggestions: Suggestion[];
  defaultValue?: string;
  name: string;
  id: string;
  placeholder?: string;
  inputClassName?: string;
};

export function SearchAutocomplete({
  suggestions,
  defaultValue = "",
  name,
  id,
  placeholder,
  inputClassName,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered =
    value.trim().length === 0
      ? []
      : suggestions
          .filter((s) => normalizeText(s.label).includes(normalizeText(value)))
          .slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pick(s: Suggestion) {
    setValue(s.value);
    setOpen(false);
    setActiveIdx(-1);
    // submit the form
    setTimeout(() => inputRef.current?.form?.requestSubmit(), 0);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      pick(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        autoComplete="off"
        className={inputClassName}
        id={id}
        name={name}
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={() => value.trim().length > 0 && setOpen(true)}
        onKeyDown={handleKey}
      />

      {open && filtered.length > 0 && (
        <ul
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-border bg-card shadow-xl",
            "divide-y divide-border/60",
          )}
          role="listbox"
        >
          {filtered.map((s, i) => (
            <li
              key={s.value + i}
              role="option"
              aria-selected={i === activeIdx}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 px-3 py-2 transition",
                i === activeIdx
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/60",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span
                className={cn(
                  "text-sm font-medium leading-tight",
                  i === activeIdx ? "text-led" : "text-foreground",
                )}
              >
                {highlight(s.label, value)}
              </span>
              {s.sublabel && (
                <span className="text-[11px] text-muted-foreground">{s.sublabel}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = normalizeText(text).indexOf(normalizeText(query));
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-led/20 text-led rounded-sm not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
