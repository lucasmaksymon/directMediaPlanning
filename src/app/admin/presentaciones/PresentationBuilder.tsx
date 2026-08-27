"use client";

import { useMemo, useState } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTheme } from "next-themes";
import { CLIENT_BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { unitToSlideDefaults } from "@/lib/presentations/slide-data";
import { normalizePresentationTheme } from "@/lib/presentations/theme";
import type {
  InventoryUnitForPresentation,
  PresentationHighlight,
  PresentationImageFit,
  PresentationSlideInput,
} from "@/lib/presentations/types";
import { normalizeImageFit } from "@/lib/presentations/image-layout";
import { btnPrimary, btnSecondary, fieldClass, surfaceCard } from "@/lib/ui-classes";

const compactField = cn(fieldClass, "h-8 px-2.5 py-1 text-xs");
const compactLabel = "block text-[10px] font-medium tracking-wide text-muted-foreground";

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
        "flex w-full items-start gap-1.5 rounded-lg border px-1.5 py-1.5 text-left",
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

function SlidePreview({
  kind,
  title,
  titleHighlight,
  eyebrow,
  subtitle,
  highlights,
  slide,
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
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-led/40 bg-[#081820] p-3 text-[#f7f9fa] shadow-[var(--shadow-md)] sm:p-4">
        <div className="flex shrink-0 items-start justify-between gap-3">
          {eyebrow ? (
            <span className="rounded-full border border-led px-2.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-led uppercase">
              {eyebrow}
            </span>
          ) : (
            <span />
          )}
          <p className="shrink-0 text-xs font-semibold tracking-wide text-[#f7f9fa]">
            {CLIENT_BRAND}
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="max-w-[90%]">
            <h3 className="text-xl font-semibold leading-tight tracking-tight text-[#f7f9fa] sm:text-2xl">
              {title || "Propuesta de paquetes"}
            </h3>
            {titleHighlight ? (
              <p className="mt-0.5 text-xl font-semibold leading-tight tracking-tight text-led sm:text-2xl">
                {titleHighlight}
              </p>
            ) : null}
            {subtitle ? (
              <p className="mt-2 max-w-[95%] text-[11px] leading-relaxed text-[rgba(247,249,250,0.72)] sm:text-xs">
                {subtitle}
              </p>
            ) : null}
          </div>
          {visibleHighlights.length > 0 ? (
            <div
              className={cn(
                "mt-4 grid gap-2",
                visibleHighlights.length === 1
                  ? "max-w-xs grid-cols-1"
                  : visibleHighlights.length === 2
                    ? "max-w-lg grid-cols-2"
                    : "grid-cols-3",
              )}
            >
              {visibleHighlights.map((h, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-md)] border border-led/80 bg-[#081820] px-2 py-1.5 text-center"
                >
                  <p className="text-base font-semibold tabular-nums text-led sm:text-lg">
                    {h.value || "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#f7f9fa]">{h.label || "Dato"}</p>
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
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-ocean p-5 text-center shadow-[var(--shadow-sm)]">
        {closingBadge ? (
          <span className="absolute top-3 right-3 rounded-full border border-led px-2.5 py-0.5 text-[9px] font-semibold text-led">
            {closingBadge}
          </span>
        ) : null}
        <div className="max-w-3xl">
          <p className="text-xl font-semibold tracking-tight text-[#f7f9fa] uppercase sm:text-2xl">
            {closingLine}
          </p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight text-led uppercase sm:text-2xl">
            {closingLineAccent}
          </p>
        </div>
        <div className="mt-5 w-full max-w-md rounded-[var(--radius-lg)] border border-led/25 px-4 py-3 text-center">
          {contactAddress ? (
            <p className="text-[11px] text-[#f7f9fa]">{contactAddress}</p>
          ) : null}
          {contactEmail ? (
            <p className={cn("text-[11px] text-led", contactAddress && "mt-1.5")}>{contactEmail}</p>
          ) : null}
          {contactWeb ? (
            <p
              className={cn(
                "text-[11px] text-led",
                (contactAddress || contactEmail) && "mt-1.5",
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

  const rows = [
    { label: "Ubicación", value: slide.location },
    { label: "Medida", value: slide.medida },
    { label: "Visibilidad", value: slide.visibilidad },
    { label: "Caras", value: slide.caras },
    { label: "Impacto", value: slide.impacto },
    { label: "Frecuencia", value: slide.frecuencia },
    { label: "Spot", value: slide.spot },
    { label: "Encendido", value: slide.encendido },
    { label: "Resolución", value: slide.resolucion },
    { label: "Pauta", value: slide.pauta },
    { label: "Costo Mensual", value: slide.costoMensual },
    { label: "Mapa", value: slide.mapsUrl },
  ].filter((r) => r.value?.trim());

  return (
    <div className="flex h-full w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background shadow-[var(--shadow-sm)]">
      <div className="flex w-[45%] flex-col justify-center gap-2 overflow-y-auto bg-card p-3 sm:p-4">
        {slide.zona ? (
          <span className="w-fit rounded-full border border-led/30 bg-led/10 px-2 py-0.5 text-[9px] font-semibold text-led">
            {slide.zona}
          </span>
        ) : slide.providerName ? (
          <p className="text-[11px] font-semibold text-led">{slide.providerName}</p>
        ) : null}
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
            {slide.slideTitle}
          </p>
        </div>
        <dl className="space-y-1 border-t border-border pt-2">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-2">
              <dt className="w-[4.75rem] shrink-0 text-[10px] font-semibold text-led">{r.label}</dt>
              <dd className="min-w-0 flex-1 break-words text-[11px] text-foreground sm:text-xs">
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
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
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
  const [providerFilter, setProviderFilter] = useState("");
  const [slides, setSlides] = useState<EditableSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewKind, setPreviewKind] = useState<"cover" | "unit" | "closing">("cover");
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultImageFit, setDefaultImageFit] = useState<PresentationImageFit>("cover");

  const providers = useMemo(() => {
    const set = new Set(units.map((u) => u.provider.companyName));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [units]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return units.filter((u) => {
      if (providerFilter && u.provider.companyName !== providerFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.locationLabel.toLowerCase().includes(q) ||
        u.provider.companyName.toLowerCase().includes(q)
      );
    });
  }, [units, query, providerFilter]);

  const selectedIds = useMemo(() => new Set(slides.map((s) => s.unitId)), [slides]);

  function toggleUnit(unit: UnitCard) {
    setError(null);
    setSlides((prev) => {
      const exists = prev.find((s) => s.unitId === unit.id);
      if (exists) {
        const next = prev.filter((s) => s.unitId !== unit.id);
        setActiveIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
        return next;
      }
      const defaults = unitToSlideDefaults(unit);
      const next: EditableSlide[] = [
        ...prev,
        {
          ...defaults,
          imageFit: defaultImageFit,
          imageUrl: unit.imageUrls[0] ?? null,
          unitName: unit.name,
          providerName: unit.provider.companyName,
        },
      ];
      setActiveIndex(next.length - 1);
      setPreviewKind("unit");
      setHighlights((h) => {
        const copy = [...h];
        if (!copy[0]?.value) copy[0] = { value: String(next.length), label: copy[0]?.label || "Pantallas" };
        else if (copy[0].label.toLowerCase().includes("pantalla") || copy[0].label.toLowerCase().includes("paquete")) {
          copy[0] = { ...copy[0], value: String(next.length) };
        }
        return copy;
      });
      return next;
    });
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
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(220px,260px)]">
        {/* Catálogo */}
        <section className={cn(surfaceCard(), "flex min-h-[14rem] flex-col gap-2 p-3 xl:min-h-0")}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Carteles</h2>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {selectedIds.size}/{filtered.length}
            </p>
          </div>
          <div className="grid gap-1.5">
            <input
              className={compactField}
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className={cn(compactField, "nm-select")}
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
            >
              <option value="">Todos los medios</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
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
                    <p className="truncate text-[11px] font-medium text-foreground">{u.name}</p>
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
        <section className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
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

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden [container-type:size]">
            <div className="aspect-video h-[min(100%,calc(100cqw*9/16))] w-[min(100%,calc(100cqh*16/9))]">
              <SlidePreview
                kind={previewKind}
                title={title}
                titleHighlight={titleHighlight}
                eyebrow={eyebrow}
                subtitle={subtitle}
                highlights={highlights}
                slide={activeSlide}
                closingLine={closingLine}
                closingLineAccent={closingLineAccent}
                closingBadge={closingBadge}
                contactAddress={contactAddress}
                contactEmail={contactEmail}
                contactWeb={contactWeb}
              />
            </div>
          </div>

          <div className={cn(surfaceCard(), "grid shrink-0 gap-x-2 gap-y-1.5 p-2.5 sm:grid-cols-2")}>
            {previewKind === "cover" ? (
              <>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Datos de portada
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className={compactLabel} htmlFor="pres-eyebrow">
                    Pill / eyebrow
                  </label>
                  <input
                    id="pres-eyebrow"
                    className={cn(compactField, "mt-0.5")}
                    value={eyebrow}
                    onChange={(e) => setEyebrow(e.target.value)}
                  />
                </div>
                <div>
                  <label className={compactLabel} htmlFor="pres-title">
                    Título (línea 1)
                  </label>
                  <input
                    id="pres-title"
                    className={cn(compactField, "mt-0.5")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className={compactLabel} htmlFor="pres-title-accent">
                    Título accent (línea 2)
                  </label>
                  <input
                    id="pres-title-accent"
                    className={cn(compactField, "mt-0.5")}
                    value={titleHighlight}
                    onChange={(e) => setTitleHighlight(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={compactLabel} htmlFor="pres-sub">
                    Subtítulo
                  </label>
                  <textarea
                    id="pres-sub"
                    className={cn(compactField, "mt-0.5 min-h-[2.5rem] resize-none py-1.5")}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:col-span-2">
                  {highlights.map((h, i) => {
                    const on = h.enabled !== false;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "grid gap-1 rounded-lg border p-1.5",
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
              </>
            ) : null}

            {previewKind === "unit" ? (
              activeSlide ? (
                <div className="sm:col-span-2 grid grid-cols-2 gap-x-2 gap-y-1 lg:grid-cols-4">
                  <div className="col-span-2 flex items-baseline justify-between gap-2 lg:col-span-4">
                    <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Cartel {activeIndex + 1}/{slides.length}
                    </p>
                    <p className="min-w-0 truncate text-[10px] text-muted-foreground">
                      {activeSlide.unitName} · {activeSlide.providerName}
                    </p>
                  </div>
                  <div className="col-span-2 flex flex-wrap items-center gap-2 lg:col-span-4">
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
                        className="ml-auto text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
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
                  {(
                    [
                      ["slideTitle", "Título", "col-span-2 lg:col-span-3"],
                      ["zona", "Zona", ""],
                      ["location", "Ubicación", "col-span-2 lg:col-span-4"],
                      ["medida", "Medida", ""],
                      ["visibilidad", "Visibilidad", ""],
                      ["caras", "Caras", ""],
                      ["impacto", "Impacto", ""],
                      ["frecuencia", "Frecuencia", ""],
                      ["spot", "Spot", ""],
                      ["encendido", "Encendido", ""],
                      ["resolucion", "Resolución", ""],
                      ["pauta", "Pauta", ""],
                      ["costoMensual", "Costo mensual", ""],
                      ["mapsUrl", "Link mapa", "col-span-2 lg:col-span-4"],
                    ] as const
                  ).map(([key, label, span]) => (
                    <div key={key} className={span || undefined}>
                      <label className={compactLabel} htmlFor={`slide-${key}`}>
                        {label}
                      </label>
                      <input
                        id={`slide-${key}`}
                        className={cn(compactField, "mt-0.5")}
                        value={activeSlide[key] ?? ""}
                        onChange={(e) => updateActiveSlide({ [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="sm:col-span-2 py-2 text-center text-xs text-muted-foreground">
                  Seleccioná un cartel del listado o del orden a la derecha para editar sus datos.
                </p>
              )
            ) : null}

            {previewKind === "closing" ? (
              <>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Datos de cierre
                  </p>
                </div>
                <div>
                  <label className={compactLabel} htmlFor="pres-closing">
                    Slogan (línea 1)
                  </label>
                  <input
                    id="pres-closing"
                    className={cn(compactField, "mt-0.5")}
                    value={closingLine}
                    onChange={(e) => setClosingLine(e.target.value)}
                  />
                </div>
                <div>
                  <label className={compactLabel} htmlFor="pres-closing-accent">
                    Slogan accent (línea 2)
                  </label>
                  <input
                    id="pres-closing-accent"
                    className={cn(compactField, "mt-0.5")}
                    value={closingLineAccent}
                    onChange={(e) => setClosingLineAccent(e.target.value)}
                  />
                </div>
                <div>
                  <label className={compactLabel} htmlFor="pres-closing-badge">
                    Badge
                  </label>
                  <input
                    id="pres-closing-badge"
                    className={cn(compactField, "mt-0.5")}
                    value={closingBadge}
                    onChange={(e) => setClosingBadge(e.target.value)}
                  />
                </div>
                <div>
                  <label className={compactLabel} htmlFor="pres-address">
                    Dirección
                  </label>
                  <input
                    id="pres-address"
                    className={cn(compactField, "mt-0.5")}
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className={compactLabel} htmlFor="pres-email">
                    Email
                  </label>
                  <input
                    id="pres-email"
                    className={cn(compactField, "mt-0.5")}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className={compactLabel} htmlFor="pres-web">
                    Web
                  </label>
                  <input
                    id="pres-web"
                    className={cn(compactField, "mt-0.5")}
                    value={contactWeb}
                    onChange={(e) => setContactWeb(e.target.value)}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>

        {/* Orden */}
        <section className={cn(surfaceCard(), "flex min-h-[14rem] flex-col gap-2 p-3 xl:min-h-0")}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Orden</h2>
            <span className="text-[11px] tabular-nums text-muted-foreground">{slides.length}</span>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
            {slides.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
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
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
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

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
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
            className={cn(btnSecondary, "h-8 min-w-[7rem] px-3 text-xs")}
            disabled={!!exporting || slides.length === 0}
            onClick={() => exportDeck("pptx")}
          >
            {exporting === "pptx" ? "Generando…" : "Exportar PPTX"}
          </button>
          <button
            type="button"
            className={cn(btnPrimary, "h-8 min-w-[7rem] px-3 text-xs")}
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
