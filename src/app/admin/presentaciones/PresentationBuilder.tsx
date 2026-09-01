"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTheme } from "next-themes";
import { CLIENT_BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { ensureUnitImpacto } from "@/app/actions/impacto";
import {
  IMPACTO_PERIODO_LABEL,
  applyImpactoPeriodo,
  detectImpactoPeriodo,
  parseImpactoNumber,
  type ImpactoPeriodo,
} from "@/lib/inventory/impacto";
import { MAX_PRESENTATION_SLIDES } from "@/lib/presentations/limits";
import {
  defaultVisibleFields,
  extractUnitSpecs,
  isFieldVisible,
  PRESENTATION_FIELD_LABELS,
  slideSpecRows,
  unitToSlideDefaults,
} from "@/lib/presentations/slide-data";
import { normalizePresentationTheme } from "@/lib/presentations/theme";
import type {
  InventoryUnitForPresentation,
  PresentationFieldKey,
  PresentationHighlight,
  PresentationImageFit,
  PresentationSlideInput,
  PresentationVisibleFields,
} from "@/lib/presentations/types";
import { PRESENTATION_FIELD_KEYS } from "@/lib/presentations/types";
import { normalizeImageFit } from "@/lib/presentations/image-layout";
import { cleanLocationLabel } from "@/lib/inventory/unit-specs";
import { btnPrimary, btnSecondary, fieldClass, selectClassCompact, surfaceCard } from "@/lib/ui-classes";

const compactField = cn(fieldClass, "h-8 px-2.5 py-1 text-xs");
const compactLabel = "block text-[10px] font-medium tracking-wide text-muted-foreground";

const IMPACTO_PERIODO_SHORT: Record<ImpactoPeriodo, string> = {
  diario: "Día",
  semanal: "Sem",
  mensual: "Mes",
};

function SlideField({
  id,
  label,
  value,
  onChange,
  className,
  children,
}: {
  id: string;
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className={compactLabel} htmlFor={id}>
        {label}
      </label>
      {children ?? (
        <input
          id={id}
          className={cn(compactField, "mt-0.5")}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  );
}

/** Lienzo de preview = widescreen 16:9 (igual que el PPTX). Se escala entero. */
const SLIDE_W = 1280;
const SLIDE_H = 720;

function isKitPageImage(url: string | null | undefined) {
  return Boolean(url && /\/inventory\/(marti-publicidad|pc-carnevale)\//.test(url));
}

function ScaledSlideFrame({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const update = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      setScale(Math.min(width / SLIDE_W, height / SLIDE_H));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className="flex h-full w-full items-center justify-center overflow-hidden bg-muted/25"
    >
      <div
        className="relative overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]"
        style={{
          width: SLIDE_W * scale,
          height: SLIDE_H * scale,
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: SLIDE_W,
            height: SLIDE_H,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

type UnitCard = InventoryUnitForPresentation & {
  basePriceAmount?: string;
};

type EditableSlide = PresentationSlideInput & {
  imageUrl: string | null;
  unitName: string;
  providerName: string;
};

const DEFAULT_HIGHLIGHTS: PresentationHighlight[] = [
  { value: "14", label: "Paquetes LED", enabled: true },
  { value: "AMBA", label: "Cobertura estratégica", enabled: true },
  { value: "100%", label: "Contenido dinámico", enabled: true },
];

const SIN_ZONA = "__sin_zona__";

function zonaOf(unit: UnitCard) {
  return extractUnitSpecs(unit).zona?.trim() || "";
}

/** Evita el ruido "Espacio — CABA — AV. FOO" en el listado. */
function catalogUnitLabel(unit: UnitCard) {
  const loc = cleanLocationLabel(unit.locationLabel) || unit.locationLabel.trim();
  if (loc.length >= 4) return loc;
  const parts = unit.name.split(/\s*[—–]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && /^espacio$/i.test(parts[0])) return parts[parts.length - 1];
  return unit.name;
}

function buildSlide(unit: UnitCard, imageFit: PresentationImageFit): EditableSlide {
  const defaults = unitToSlideDefaults(unit);
  const imageUrl = unit.imageUrls[0] ?? null;
  return {
    ...defaults,
    imageFit: isKitPageImage(imageUrl) ? "contain" : imageFit,
    imageUrl,
    unitName: catalogUnitLabel(unit),
    providerName: unit.provider.companyName,
  };
}

function bumpHighlightCount(count: number, prev: PresentationHighlight[]) {
  const copy = [...prev];
  const label = copy[0]?.label || "Pantallas";
  if (!copy[0]?.value) {
    copy[0] = { value: String(count), label };
  } else if (
    label.toLowerCase().includes("pantalla") ||
    label.toLowerCase().includes("paquete")
  ) {
    copy[0] = { ...copy[0], value: String(count) };
  }
  return copy;
}

function SortableOrderItem({
  slide,
  index,
  active,
  onSelect,
}: {
  slide: EditableSlide;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.unitId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex w-[13.5rem] shrink-0 items-start gap-1.5 rounded-lg border px-1.5 py-1.5 text-left",
        active ? "border-led/50 bg-led/8" : "border-border bg-muted/20",
        isDragging && "z-10 border-led bg-card shadow-[var(--shadow-md)] opacity-95",
      )}
    >
      <button
        type="button"
        className="mt-0.5 flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing touch-none"
        aria-label={`Arrastrar ${slide.slideTitle}`}
        {...attributes}
        {...listeners}
      >
        <svg viewBox="0 0 12 16" className="h-3 w-2" fill="currentColor" aria-hidden>
          <circle cx="3" cy="3" r="1.2" />
          <circle cx="9" cy="3" r="1.2" />
          <circle cx="3" cy="8" r="1.2" />
          <circle cx="9" cy="8" r="1.2" />
          <circle cx="3" cy="13" r="1.2" />
          <circle cx="9" cy="13" r="1.2" />
        </svg>
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <div className="flex items-start gap-1.5">
          <span className="mt-0.5 w-4 shrink-0 text-center text-[10px] font-bold tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium">{slide.slideTitle}</p>
            <p className="truncate text-[10px] text-muted-foreground">{slide.location}</p>
          </div>
        </div>
      </button>
    </div>
  );
}

function FilterMultiSelect({
  labelAll,
  labelOne,
  labelMany,
  options,
  selected,
  onChange,
  ariaLabel,
}: {
  labelAll: string;
  labelOne?: string;
  labelMany: (n: number) => string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const summary =
    selected.length === 0
      ? labelAll
      : selected.length === 1
        ? (labelOne ?? options.find((o) => o.value === selected[0])?.label ?? labelAll)
        : labelMany(selected.length);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        className={cn(selectClassCompact, "flex items-center text-left")}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 truncate">{summary}</span>
      </button>
      {open ? (
        <div
          className="absolute z-30 mt-1 max-h-56 w-full min-w-[12rem] overflow-y-auto rounded-[var(--radius-md)] border border-border bg-card p-1 shadow-[var(--shadow-md)]"
          role="listbox"
          aria-multiselectable
        >
          {options.map((opt) => {
            const on = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                  on ? "bg-led/10 text-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                <input
                  type="checkbox"
                  className="size-3.5 shrink-0 accent-[var(--led)]"
                  checked={on}
                  onChange={() => toggle(opt.value)}
                />
                <span className="min-w-0 truncate">{opt.label}</span>
              </label>
            );
          })}
          {selected.length > 0 ? (
            <button
              type="button"
              className="mt-0.5 w-full rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
              onClick={() => onChange([])}
            >
              Limpiar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FieldVisibilityBar({
  visibleFields,
  onChange,
}: {
  visibleFields: Record<PresentationFieldKey, boolean>;
  onChange: (next: Record<PresentationFieldKey, boolean>) => void;
}) {
  const enabledCount = PRESENTATION_FIELD_KEYS.filter((key) => visibleFields[key]).length;

  return (
    <div className="sm:col-span-2 lg:col-span-3 2xl:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Datos en todos los carteles
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {enabledCount}/{PRESENTATION_FIELD_KEYS.length}
          </span>
          <button
            type="button"
            className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => onChange(defaultVisibleFields())}
          >
            Todos
          </button>
          <button
            type="button"
            className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() =>
              onChange(
                Object.fromEntries(PRESENTATION_FIELD_KEYS.map((key) => [key, false])) as Record<
                  PresentationFieldKey,
                  boolean
                >,
              )
            }
          >
            Ninguno
          </button>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {PRESENTATION_FIELD_KEYS.map((key) => {
          const on = visibleFields[key];
          return (
            <label
              key={key}
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition",
                on ? "bg-led text-black" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={(e) => onChange({ ...visibleFields, [key]: e.target.checked })}
              />
              {PRESENTATION_FIELD_LABELS[key]}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SlidePreview({
  kind,
  title,
  titleHighlight,
  eyebrow,
  subtitle,
  highlights,
  slide,
  visibleFields,
  closingLine,
  closingLineAccent,
  closingBadge,
  contactAddress,
  contactEmail,
  contactWeb,
}: {
  kind: "cover" | "unit" | "closing";
  title: string;
  titleHighlight: string;
  eyebrow: string;
  subtitle: string;
  highlights: PresentationHighlight[];
  slide: EditableSlide | null;
  visibleFields: PresentationVisibleFields;
  closingLine: string;
  closingLineAccent: string;
  closingBadge: string;
  contactAddress: string;
  contactEmail: string;
  contactWeb: string;
}) {
  if (kind === "cover") {
    const visibleHighlights = highlights
      .filter((h) => h.enabled !== false && (h.value.trim() || h.label.trim()))
      .slice(0, 3);

    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden border border-led/40 bg-[#081820] px-14 py-12 text-[#f7f9fa]">
        <div className="flex shrink-0 items-start justify-between gap-6">
          {eyebrow ? (
            <span className="rounded-full border border-led px-4 py-1.5 text-[15px] font-semibold tracking-[0.14em] text-led uppercase">
              {eyebrow}
            </span>
          ) : (
            <span />
          )}
          <p className="shrink-0 text-[18px] font-semibold tracking-wide text-[#f7f9fa]">
            {CLIENT_BRAND}
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="max-w-[90%]">
            <h3 className="text-[48px] font-semibold leading-[1.08] tracking-tight text-[#f7f9fa]">
              {title || "Propuesta de paquetes"}
            </h3>
            {titleHighlight ? (
              <p className="mt-1 text-[48px] font-semibold leading-[1.08] tracking-tight text-led">
                {titleHighlight}
              </p>
            ) : null}
            {subtitle ? (
              <p className="mt-5 max-w-[46rem] text-[18px] leading-relaxed text-[rgba(247,249,250,0.72)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {visibleHighlights.length > 0 ? (
            <div
              className={cn(
                "mt-10 grid gap-4",
                visibleHighlights.length === 1
                  ? "max-w-xs grid-cols-1"
                  : visibleHighlights.length === 2
                    ? "max-w-2xl grid-cols-2"
                    : "grid-cols-3",
              )}
            >
              {visibleHighlights.map((h, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-md)] border border-led/80 bg-[#081820] px-5 py-4 text-center"
                >
                  <p className="text-[32px] font-semibold tabular-nums text-led">{h.value || "—"}</p>
                  <p className="mt-1 text-[14px] text-[#f7f9fa]">{h.label || "Dato"}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (kind === "closing") {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-ocean px-16 py-12 text-center">
        {closingBadge ? (
          <span className="absolute top-10 right-12 rounded-full border border-led px-4 py-1.5 text-[14px] font-semibold text-led">
            {closingBadge}
          </span>
        ) : null}
        <div className="max-w-4xl">
          <p className="text-[44px] font-semibold tracking-tight text-[#f7f9fa] uppercase">
            {closingLine}
          </p>
          <p className="mt-1 text-[44px] font-semibold tracking-tight text-led uppercase">
            {closingLineAccent}
          </p>
        </div>
        <div className="mt-10 w-full max-w-xl rounded-[var(--radius-lg)] border border-led/25 px-8 py-6 text-center">
          {contactAddress ? (
            <p className="text-[16px] text-[#f7f9fa]">{contactAddress}</p>
          ) : null}
          {contactEmail ? (
            <p className={cn("text-[16px] text-led", contactAddress && "mt-2")}>{contactEmail}</p>
          ) : null}
          {contactWeb ? (
            <p
              className={cn(
                "text-[16px] text-led",
                (contactAddress || contactEmail) && "mt-2",
              )}
            >
              {contactWeb}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!slide) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
        Seleccioná un cartel para previsualizar
      </div>
    );
  }

  const rows = slideSpecRows(slide, visibleFields);

  return (
    <div className="flex h-full w-full overflow-hidden border border-border bg-card">
      <div className="flex w-[45%] flex-col justify-center gap-5 bg-card px-10 py-9">
        {isFieldVisible(visibleFields, "zona") ? (
          slide.zona ? (
            <span className="w-fit rounded-full border border-led/30 bg-led/10 px-3 py-1 text-[13px] font-semibold text-led">
              {slide.zona}
            </span>
          ) : slide.providerName ? (
            <p className="text-[16px] font-semibold text-led">{slide.providerName}</p>
          ) : null
        ) : null}
        <p className="text-[32px] font-semibold leading-tight tracking-tight text-foreground">
          {slide.slideTitle}
        </p>
        <dl className="space-y-3 border-t border-border pt-5">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-4">
              <dt className="w-[8.5rem] shrink-0 text-[13px] font-semibold leading-snug text-led">
                {r.label}
              </dt>
              <dd className="min-w-0 flex-1 break-words text-[16px] leading-snug text-foreground">
                {r.label === "Mapa" ? (
                  <a
                    href={r.value}
                    target="_blank"
                    rel="noreferrer"
                    className="text-led underline underline-offset-2"
                  >
                    Ver en Google Maps
                  </a>
                ) : (
                  r.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="relative w-[55%] overflow-hidden bg-card">
        {slide.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={slide.unitName}
            className={cn(
              "absolute inset-0 h-full w-full",
              normalizeImageFit(slide.imageFit) === "contain"
                ? "object-contain"
                : "object-cover",
            )}
            src={slide.imageUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[18px] text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>
    </div>
  );
}

export function PresentationBuilder({ units }: { units: UnitCard[] }) {
  const { resolvedTheme } = useTheme();
  const [title, setTitle] = useState("Propuesta de paquetes");
  const [titleHighlight, setTitleHighlight] = useState("Pantallas LED");
  const [eyebrow, setEyebrow] = useState("Circuitos digitales premium");
  const [subtitle, setSubtitle] = useState(
    "Circuito integral de vía pública con nodos de alto tráfico vehicular y peatonal en CABA y GBA.",
  );
  const [highlights, setHighlights] = useState<PresentationHighlight[]>(DEFAULT_HIGHLIGHTS);
  const [closingLine, setClosingLine] = useState("Creamos conexiones que");
  const [closingLineAccent, setClosingLineAccent] = useState("generan resultados");
  const [closingBadge, setClosingBadge] = useState("Contacto Comercial");
  const [contactAddress, setContactAddress] = useState(
    "Alicia Moreau de Justo 1150, 4to Of. 410B, CABA",
  );
  const [contactEmail, setContactEmail] = useState("admin@nextmedia.com.ar");
  const [contactWeb, setContactWeb] = useState("nextmedia.com.ar");
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string[]>([]);
  const [zonaFilter, setZonaFilter] = useState<string[]>([]);
  const [slides, setSlides] = useState<EditableSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewKind, setPreviewKind] = useState<"cover" | "unit" | "closing">("cover");
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultImageFit, setDefaultImageFit] = useState<PresentationImageFit>("cover");
  const [visibleFields, setVisibleFields] = useState(defaultVisibleFields);

  const providers = useMemo(() => {
    const set = new Set(units.map((u) => u.provider.companyName));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [units]);

  const zonas = useMemo(() => {
    const set = new Set<string>();
    let hasEmpty = false;
    for (const u of units) {
      const z = zonaOf(u);
      if (z) set.add(z);
      else hasEmpty = true;
    }
    const list = Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
    return { list, hasEmpty };
  }, [units]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const providersSel = new Set(providerFilter);
    const zonasSel = new Set(zonaFilter);
    return units.filter((u) => {
      if (providersSel.size > 0 && !providersSel.has(u.provider.companyName)) return false;
      if (zonasSel.size > 0) {
        const zonaKey = zonaOf(u) || SIN_ZONA;
        if (!zonasSel.has(zonaKey)) return false;
      }
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.locationLabel.toLowerCase().includes(q) ||
        u.provider.companyName.toLowerCase().includes(q) ||
        zonaOf(u).toLowerCase().includes(q)
      );
    });
  }, [units, query, providerFilter, zonaFilter]);

  const selectedIds = useMemo(() => new Set(slides.map((s) => s.unitId)), [slides]);

  const remainingVisible = filtered.filter((u) => !selectedIds.has(u.id));

  const addVisibleLabel = (() => {
    const n = remainingVisible.length;
    if (n === 0) return "Ya están en el deck";
    const bits: string[] = [];
    if (providerFilter.length === 1) bits.push(providerFilter[0]);
    else if (providerFilter.length > 1) bits.push(`${providerFilter.length} medios`);
    if (zonaFilter.length === 1) {
      bits.push(zonaFilter[0] === SIN_ZONA ? "sin zona" : zonaFilter[0]);
    } else if (zonaFilter.length > 1) {
      bits.push(`${zonaFilter.length} zonas`);
    }
    if (bits.length > 0) return `Agregar ${n} de ${bits.join(" · ")}`;
    if (query.trim()) return `Agregar ${n} de la búsqueda`;
    return `Agregar todos (${n})`;
  })();

  async function fillImpacto(unitId: string) {
    try {
      const res = await ensureUnitImpacto(unitId);
      if (!res.ok) return;
      setSlides((prev) =>
        prev.map((s) =>
          s.unitId === unitId
            ? { ...s, impacto: res.impacto, impactoPeriodo: res.periodo }
            : s,
        ),
      );
    } catch {
      // El slide ya sale con el impacto del kit; no frenar el alta masiva.
    }
  }

  function addUnits(candidates: UnitCard[]) {
    const have = new Set(slides.map((s) => s.unitId));
    let fresh = candidates.filter((u) => !have.has(u.id));
    if (fresh.length === 0) {
      if (candidates.length > 0) setError("Esos carteles ya están en la presentación.");
      return;
    }

    const room = MAX_PRESENTATION_SLIDES - slides.length;
    if (room <= 0) {
      setError(`Máximo ${MAX_PRESENTATION_SLIDES} carteles por presentación.`);
      return;
    }

    let overflow = false;
    if (fresh.length > room) {
      fresh = fresh.slice(0, room);
      overflow = true;
    }

    setError(
      overflow
        ? `Se agregaron ${fresh.length}. Máximo ${MAX_PRESENTATION_SLIDES} carteles por presentación.`
        : null,
    );

    const nextLength = slides.length + fresh.length;
    setSlides((prev) => {
      const ids = new Set(prev.map((s) => s.unitId));
      const extra = fresh.filter((u) => !ids.has(u.id));
      if (extra.length === 0) return prev;
      return [...prev, ...extra.map((u) => buildSlide(u, defaultImageFit))];
    });
    setActiveIndex(nextLength - 1);
    setPreviewKind("unit");
    setHighlights((h) => bumpHighlightCount(nextLength, h));

    // Solo estimar si el kit del medio no trae impacto. En lote no disparamos N actions.
    if (fresh.length === 1) {
      const slide = buildSlide(fresh[0], defaultImageFit);
      if (!parseImpactoNumber(slide.impacto || "")) void fillImpacto(fresh[0].id);
    }
  }

  function toggleUnit(unit: UnitCard) {
    if (slides.some((s) => s.unitId === unit.id)) {
      setError(null);
      setSlides((prev) => {
        const next = prev.filter((s) => s.unitId !== unit.id);
        setActiveIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
        return next;
      });
      return;
    }
    addUnits([unit]);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSlides((prev) => {
      const oldIndex = prev.findIndex((s) => s.unitId === active.id);
      const newIndex = prev.findIndex((s) => s.unitId === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      setActiveIndex(newIndex);
      setPreviewKind("unit");
      return next;
    });
  }

  function updateActiveSlide(patch: Partial<EditableSlide>) {
    setSlides((prev) =>
      prev.map((s, i) => (i === activeIndex ? { ...s, ...patch } : s)),
    );
  }

  const activeSlide = slides[activeIndex] ?? null;

  async function exportDeck(format: "pdf" | "pptx") {
    if (slides.length === 0) {
      setError("Seleccioná al menos un cartel.");
      return;
    }
    if (slides.length > MAX_PRESENTATION_SLIDES) {
      setError(`Máximo ${MAX_PRESENTATION_SLIDES} carteles por presentación.`);
      return;
    }
    if (!title.trim()) {
      setError("Ingresá un título para la presentación.");
      return;
    }
    setExporting(format);
    setError(null);
    try {
      const res = await fetch("/api/presentations/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          theme: normalizePresentationTheme(resolvedTheme),
          title: title.trim(),
          titleHighlight: titleHighlight.trim(),
          eyebrow: eyebrow.trim(),
          subtitle: subtitle.trim(),
          highlights: highlights.filter(
            (h) => h.enabled !== false && (h.value.trim() || h.label.trim()),
          ),
          visibleFields,
          closingLine: closingLine.trim(),
          closingLineAccent: closingLineAccent.trim(),
          closingBadge: closingBadge.trim(),
          contactAddress: contactAddress.trim(),
          contactEmail: contactEmail.trim(),
          contactWeb: contactWeb.trim(),
          slides: slides.map((s) => ({
            unitId: s.unitId,
            slideTitle: s.slideTitle,
            location: s.location,
            zona: s.zona || undefined,
            medida: s.medida || undefined,
            visibilidad: s.visibilidad || undefined,
            caras: s.caras || undefined,
            impacto: s.impacto || undefined,
            impactoPeriodo: s.impactoPeriodo || undefined,
            frecuencia: s.frecuencia || undefined,
            spot: s.spot || undefined,
            encendido: s.encendido || undefined,
            resolucion: s.resolucion || undefined,
            pauta: s.pauta || undefined,
            costoMensual: s.costoMensual || undefined,
            mapsUrl: s.mapsUrl || undefined,
            imageFit: normalizeImageFit(s.imageFit),
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo exportar.");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const match = cd?.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `presentacion.${format === "pdf" ? "pdf" : "pptx"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2 lg:h-full">
      <div className="grid min-w-0 gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
        {/* Catálogo */}
        <section className={cn(surfaceCard(), "flex max-h-64 min-h-0 min-w-0 flex-col gap-2 overflow-visible p-3 lg:max-h-none")}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Carteles</h2>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {selectedIds.size} en el deck · {filtered.length} visibles
            </p>
          </div>
          <div className="grid gap-1.5">
            <input
              className={compactField}
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <FilterMultiSelect
                ariaLabel="Filtrar por medios"
                labelAll="Todos los medios"
                labelMany={(n) => `${n} medios`}
                options={providers.map((p) => ({ value: p, label: p }))}
                selected={providerFilter}
                onChange={setProviderFilter}
              />
              <FilterMultiSelect
                ariaLabel="Filtrar por zonas"
                labelAll="Todas las zonas"
                labelMany={(n) => `${n} zonas`}
                options={[
                  ...zonas.list.map((z) => ({ value: z, label: z })),
                  ...(zonas.hasEmpty ? [{ value: SIN_ZONA, label: "Sin zona" }] : []),
                ]}
                selected={zonaFilter}
                onChange={setZonaFilter}
              />
            </div>
            <button
              type="button"
              className={cn(btnSecondary, "h-9 px-2.5 text-xs")}
              disabled={remainingVisible.length === 0}
              onClick={() => {
                const n = remainingVisible.length;
                if (
                  n > 25 &&
                  !window.confirm(
                    `Esto agrega ${n} carteles a la presentación. ¿Seguís?`,
                  )
                ) {
                  return;
                }
                addUnits(filtered);
              }}
            >
              {addVisibleLabel}
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
            {filtered.slice(0, 200).map((u) => {
              const selected = selectedIds.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUnit(u)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all",
                    selected
                      ? "border-led/50 bg-led/8"
                      : "border-border bg-muted/30 hover:border-led/20",
                  )}
                >
                  <div className="h-8 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                    {u.imageUrls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={u.imageUrls[0]} />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-foreground">{catalogUnitLabel(u)}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {u.provider.companyName} · {u.locationLabel}
                    </p>
                  </div>
                </button>
              );
            })}
            {filtered.length > 200 ? (
              <p className="py-2 text-center text-[11px] text-muted-foreground">
                Mostrando 200 de {filtered.length}. Refiná la búsqueda.
              </p>
            ) : null}
          </div>
        </section>

        {/* Preview + config */}
        <section className="flex min-h-0 min-w-0 flex-col gap-2 lg:h-full lg:overflow-hidden 2xl:grid 2xl:grid-cols-[minmax(0,1.35fr)_minmax(24rem,1fr)] 2xl:grid-rows-[auto_minmax(0,1fr)]">
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 2xl:col-span-2">
            {(
              [
                ["cover", "Portada"],
                ["unit", "Cartel"],
                ["closing", "Cierre"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setPreviewKind(k)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition",
                  previewKind === k
                    ? "bg-led text-black"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
            {previewKind === "unit" && slides.length > 0 ? (
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  className={cn(btnSecondary, "h-7 px-2 py-0 text-xs")}
                  disabled={activeIndex <= 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                >
                  ←
                </button>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {activeIndex + 1}/{slides.length}
                </span>
                <button
                  type="button"
                  className={cn(btnSecondary, "h-7 px-2 py-0 text-xs")}
                  disabled={activeIndex >= slides.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(slides.length - 1, i + 1))}
                >
                  →
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-2 2xl:min-h-0 2xl:h-full">
          <div className="mx-auto w-full min-w-0 shrink-0 max-w-[min(100%,calc(min(44vh,26rem)*16/9))] 2xl:mx-0 2xl:h-auto 2xl:max-w-none 2xl:min-h-0 2xl:flex-1">
            <div className="aspect-video overflow-hidden 2xl:aspect-auto 2xl:h-full">
              <ScaledSlideFrame>
                <SlidePreview
                  kind={previewKind}
                  title={title}
                  titleHighlight={titleHighlight}
                  eyebrow={eyebrow}
                  subtitle={subtitle}
                  highlights={highlights}
                  slide={activeSlide}
                  visibleFields={visibleFields}
                  closingLine={closingLine}
                  closingLineAccent={closingLineAccent}
                  closingBadge={closingBadge}
                  contactAddress={contactAddress}
                  contactEmail={contactEmail}
                  contactWeb={contactWeb}
                />
              </ScaledSlideFrame>
            </div>
          </div>

          <section className={cn(surfaceCard(), "flex shrink-0 flex-col gap-1.5 p-2")}>
            <div className="flex items-baseline justify-between gap-2 px-0.5">
              <h2 className="text-sm font-semibold text-foreground">Orden</h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-muted-foreground">{slides.length}</span>
                {slides.length > 0 ? (
                  <button
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSlides([]);
                      setActiveIndex(0);
                      setPreviewKind("cover");
                      setError(null);
                    }}
                    type="button"
                  >
                    Vaciar
                  </button>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 overflow-x-auto overflow-y-hidden [scrollbar-gutter:stable]">
              {slides.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-center text-[11px] text-muted-foreground">
                  Elegí carteles del listado para armar el deck.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={slides.map((s) => s.unitId)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex gap-1.5 pb-0.5">
                      {slides.map((s, i) => (
                        <SortableOrderItem
                          key={s.unitId}
                          slide={s}
                          index={i}
                          active={i === activeIndex && previewKind === "unit"}
                          onSelect={() => {
                            setActiveIndex(i);
                            setPreviewKind("unit");
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </section>
          </div>

          <div className={cn(surfaceCard(), "flex min-h-0 flex-1 flex-col overflow-hidden p-2.5 2xl:h-full")}>
            {previewKind === "cover" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <p className="shrink-0 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Datos de portada
                </p>
                <SlideField id="pres-eyebrow" label="Pill / eyebrow" value={eyebrow} onChange={setEyebrow} />
                <div className="grid shrink-0 grid-cols-1 gap-x-2 gap-y-1.5 sm:grid-cols-2">
                  <SlideField id="pres-title" label="Título (línea 1)" value={title} onChange={setTitle} />
                  <SlideField id="pres-title-accent" label="Título accent (línea 2)" value={titleHighlight} onChange={setTitleHighlight} />
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <label className={compactLabel} htmlFor="pres-sub">
                    Subtítulo
                  </label>
                  <textarea
                    id="pres-sub"
                    className={cn(
                      fieldClass,
                      "mt-0.5 min-h-[5.5rem] flex-1 resize-none overflow-auto px-2.5 py-2 text-xs",
                    )}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                  />
                </div>
                <div className="grid shrink-0 grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {highlights.map((h, i) => {
                    const on = h.enabled !== false;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "grid gap-1 rounded-lg border p-2",
                          on ? "border-border" : "border-dashed border-border/60 opacity-60",
                        )}
                      >
                        <label className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            className="size-3.5 accent-[var(--led)]"
                            checked={on}
                            onChange={(e) =>
                              setHighlights((prev) =>
                                prev.map((x, j) =>
                                  j === i ? { ...x, enabled: e.target.checked } : x,
                                ),
                              )
                            }
                          />
                          <span className={compactLabel}>Dato {i + 1}</span>
                        </label>
                        <div>
                          <label className={compactLabel}>Valor</label>
                          <input
                            className={cn(compactField, "mt-0.5")}
                            value={h.value}
                            disabled={!on}
                            onChange={(e) =>
                              setHighlights((prev) =>
                                prev.map((x, j) =>
                                  j === i ? { ...x, value: e.target.value } : x,
                                ),
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className={compactLabel}>Etiqueta</label>
                          <input
                            className={cn(compactField, "mt-0.5")}
                            value={h.label}
                            disabled={!on}
                            onChange={(e) =>
                              setHighlights((prev) =>
                                prev.map((x, j) =>
                                  j === i ? { ...x, label: e.target.value } : x,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {previewKind === "unit" ? (
              <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-x-2 gap-y-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-2">
                <FieldVisibilityBar visibleFields={visibleFields} onChange={setVisibleFields} />
                {activeSlide ? (
                  <>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 sm:col-span-2 lg:col-span-3 2xl:col-span-2">
                    <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Cartel {activeIndex + 1}/{slides.length}
                    </p>
                    <p className="min-w-0 truncate text-[10px] text-muted-foreground">
                      {activeSlide.unitName} · {activeSlide.providerName}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                      <span className={compactLabel}>Imagen</span>
                      {(
                        [
                          ["cover", "Recortada"],
                          ["contain", "Completa"],
                        ] as const
                      ).map(([mode, label]) => {
                        const active = normalizeImageFit(activeSlide.imageFit) === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition",
                              active
                                ? "bg-led text-black"
                                : "bg-muted text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => {
                              updateActiveSlide({ imageFit: mode });
                              setDefaultImageFit(mode);
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                      {slides.length > 1 ? (
                        <button
                          type="button"
                          className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => {
                            const fit = normalizeImageFit(activeSlide.imageFit);
                            setSlides((prev) => prev.map((s) => ({ ...s, imageFit: fit })));
                            setDefaultImageFit(fit);
                          }}
                        >
                          Aplicar a todos
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <SlideField
                    id="slide-slideTitle"
                    label="Título"
                    value={activeSlide.slideTitle}
                    onChange={(v) => updateActiveSlide({ slideTitle: v })}
                  />
                  <SlideField
                    id="slide-zona"
                    label="Zona"
                    value={activeSlide.zona}
                    onChange={(v) => updateActiveSlide({ zona: v })}
                    className={cn(!visibleFields.zona && "opacity-45")}
                  />
                  <SlideField
                    id="slide-medida"
                    label="Medida"
                    value={activeSlide.medida}
                    onChange={(v) => updateActiveSlide({ medida: v })}
                    className={cn(!visibleFields.medida && "opacity-45")}
                  />
                  <SlideField
                    id="slide-location"
                    label="Ubicación"
                    value={activeSlide.location}
                    onChange={(v) => updateActiveSlide({ location: v })}
                    className={cn(!visibleFields.location && "opacity-45")}
                  />
                  <SlideField
                    id="slide-visibilidad"
                    label="Visibilidad"
                    value={activeSlide.visibilidad}
                    onChange={(v) => updateActiveSlide({ visibilidad: v })}
                    className={cn(!visibleFields.visibilidad && "opacity-45")}
                  />
                  <SlideField
                    id="slide-caras"
                    label="Caras"
                    value={activeSlide.caras}
                    onChange={(v) => updateActiveSlide({ caras: v })}
                    className={cn(!visibleFields.caras && "opacity-45")}
                  />
                  <SlideField
                    id="slide-impacto"
                    label="Impacto"
                    className={cn("sm:col-span-2", !visibleFields.impacto && "opacity-45")}
                  >
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                      <input
                        id="slide-impacto"
                        className={cn(compactField, "min-w-0 flex-1")}
                        value={activeSlide.impacto ?? ""}
                        onChange={(e) => {
                          const periodo =
                            detectImpactoPeriodo(e.target.value) ||
                            activeSlide.impactoPeriodo ||
                            "semanal";
                          updateActiveSlide({
                            impacto: e.target.value,
                            impactoPeriodo: periodo,
                          });
                        }}
                      />
                      <div
                        className="flex h-8 shrink-0 items-stretch rounded-[var(--radius-input)] border border-border p-0.5"
                        role="group"
                        aria-label="Periodicidad del impacto"
                      >
                        {(Object.keys(IMPACTO_PERIODO_LABEL) as ImpactoPeriodo[]).map((p) => {
                          const current =
                            activeSlide.impactoPeriodo ||
                            detectImpactoPeriodo(activeSlide.impacto ?? "") ||
                            "semanal";
                          const on = current === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              title={IMPACTO_PERIODO_LABEL[p]}
                              className={cn(
                                "rounded-md px-2.5 text-[10px] font-semibold",
                                on ? "bg-led text-black" : "text-muted-foreground hover:text-foreground",
                              )}
                              onClick={() =>
                                updateActiveSlide({
                                  impactoPeriodo: p,
                                  impacto: applyImpactoPeriodo(activeSlide.impacto ?? "", p),
                                })
                              }
                            >
                              {IMPACTO_PERIODO_SHORT[p]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </SlideField>
                  <SlideField
                    id="slide-pauta"
                    label="Pauta"
                    value={activeSlide.pauta}
                    onChange={(v) => updateActiveSlide({ pauta: v })}
                    className={cn(!visibleFields.pauta && "opacity-45")}
                  />
                  {(
                    [
                      ["frecuencia", "Frecuencia"],
                      ["spot", "Spot"],
                      ["encendido", "Encendido"],
                      ["resolucion", "Resolución"],
                    ] as const
                  )
                    .filter(([key]) => Boolean(activeSlide[key]?.trim()))
                    .map(([key, label]) => (
                      <SlideField
                        key={key}
                        id={`slide-${key}`}
                        label={label}
                        value={activeSlide[key]}
                        onChange={(v) => updateActiveSlide({ [key]: v })}
                        className={cn(!visibleFields[key] && "opacity-45")}
                      />
                    ))}
                  <SlideField
                    id="slide-costoMensual"
                    label="Costo mensual"
                    value={activeSlide.costoMensual}
                    onChange={(v) => updateActiveSlide({ costoMensual: v })}
                    className={cn(!visibleFields.costoMensual && "opacity-45")}
                  />
                  <SlideField
                    id="slide-mapsUrl"
                    label="Link mapa"
                    value={activeSlide.mapsUrl}
                    onChange={(v) => updateActiveSlide({ mapsUrl: v })}
                    className={cn(
                      "sm:col-span-2 lg:col-span-3 2xl:col-span-2",
                      !visibleFields.mapsUrl && "opacity-45",
                    )}
                  />
                  </>
                ) : (
                  <p className="py-2 text-center text-xs text-muted-foreground sm:col-span-2 lg:col-span-3 2xl:col-span-2">
                    Seleccioná un cartel del listado o del orden debajo del preview para editar sus datos.
                  </p>
                )}
              </div>
            ) : null}

            {previewKind === "closing" ? (
              <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-x-2 gap-y-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-2">
                <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:col-span-2 lg:col-span-3 2xl:col-span-2">
                  Datos de cierre
                </p>
                <SlideField id="pres-closing" label="Slogan (línea 1)" value={closingLine} onChange={setClosingLine} />
                <SlideField id="pres-closing-accent" label="Slogan accent (línea 2)" value={closingLineAccent} onChange={setClosingLineAccent} />
                <SlideField id="pres-closing-badge" label="Badge" value={closingBadge} onChange={setClosingBadge} />
                <SlideField id="pres-address" label="Dirección" value={contactAddress} onChange={setContactAddress} />
                <SlideField id="pres-email" label="Email" value={contactEmail} onChange={setContactEmail} />
                <SlideField id="pres-web" label="Web" value={contactWeb} onChange={setContactWeb} />
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {error ? (
          <p className="text-xs text-signal" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Portada + {slides.length} carteles + cierre
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          <button
            type="button"
            className={cn(btnSecondary, "h-8 min-w-0 flex-1 px-3 text-xs sm:min-w-[7rem] sm:flex-none")}
            disabled={!!exporting || slides.length === 0}
            onClick={() => exportDeck("pptx")}
          >
            {exporting === "pptx" ? "Generando…" : "Exportar PPTX"}
          </button>
          <button
            type="button"
            className={cn(btnPrimary, "h-8 min-w-0 flex-1 px-3 text-xs sm:min-w-[7rem] sm:flex-none")}
            disabled={!!exporting || slides.length === 0}
            onClick={() => exportDeck("pdf")}
          >
            {exporting === "pdf" ? "Generando…" : "Exportar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
