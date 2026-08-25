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
  PresentationSlideInput,
} from "@/lib/presentations/types";
import { btnPrimary, btnSecondary, fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";

type UnitCard = InventoryUnitForPresentation & {
  basePriceAmount?: string;
};

type EditableSlide = PresentationSlideInput & {
  imageUrl: string | null;
  unitName: string;
  providerName: string;
};

const DEFAULT_HIGHLIGHTS: PresentationHighlight[] = [
  { value: "", label: "Pantallas" },
  { value: "100%", label: "Cobertura estratégica" },
  { value: "", label: "Contenido dinámico" },
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
        "flex w-full items-start gap-2 rounded-xl border px-2 py-2 text-left",
        active ? "border-led/50 bg-led/8" : "border-border bg-muted/20",
        isDragging && "z-10 border-led bg-card shadow-[var(--shadow-md)] opacity-95",
      )}
    >
      <button
        type="button"
        className="mt-0.5 flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing touch-none"
        aria-label={`Arrastrar ${slide.slideTitle}`}
        {...attributes}
        {...listeners}
      >
        <svg viewBox="0 0 12 16" className="h-3.5 w-2.5" fill="currentColor" aria-hidden>
          <circle cx="3" cy="3" r="1.2" />
          <circle cx="9" cy="3" r="1.2" />
          <circle cx="3" cy="8" r="1.2" />
          <circle cx="9" cy="8" r="1.2" />
          <circle cx="3" cy="13" r="1.2" />
          <circle cx="9" cy="13" r="1.2" />
        </svg>
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 w-5 shrink-0 text-center text-[11px] font-bold tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{slide.slideTitle}</p>
            <p className="truncate text-[11px] text-muted-foreground">{slide.location}</p>
          </div>
        </div>
      </button>
    </div>
  );
}

function SlidePreview({
  kind,
  title,
  subtitle,
  highlights,
  slide,
  closingLine,
  contactLines,
}: {
  kind: "cover" | "unit" | "closing";
  title: string;
  subtitle: string;
  highlights: PresentationHighlight[];
  slide: EditableSlide | null;
  closingLine: string;
  contactLines: string[];
}) {
  if (kind === "cover") {
    return (
      <div className="flex aspect-video w-full flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-led" />
            <p className="text-[10px] font-semibold tracking-[0.16em] text-led uppercase">
              {CLIENT_BRAND}
            </p>
          </div>
          <h3 className="mt-4 max-w-[90%] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title || "Título de la presentación"}
          </h3>
          {subtitle ? (
            <p className="mt-3 max-w-[80%] text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {highlights
              .filter((h) => h.value.trim() || h.label.trim())
              .slice(0, 3)
              .map((h, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card px-3 py-3 pl-3.5"
                >
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-led" aria-hidden />
                  <p className="text-lg font-semibold tabular-nums text-led">{h.value || "—"}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{h.label || "Dato"}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (kind === "closing") {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-ocean p-8 text-center shadow-[var(--shadow-sm)]">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-led uppercase">
          {CLIENT_BRAND}
        </p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] dark:text-[#f7f9fa]">
          <span className="text-led">Next</span>
          <span className="text-[#f7f9fa]">Planning</span>
        </p>
        <p className="mt-3 max-w-md text-sm text-[rgba(247,249,250,0.66)]">{closingLine}</p>
        <div className="mt-6 space-y-1 text-xs text-[rgba(247,249,250,0.66)]">
          {contactLines.filter(Boolean).map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </div>
    );
  }

  if (!slide) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
        Seleccioná un cartel para previsualizar
      </div>
    );
  }

  const rows = [
    { label: "Medida", value: slide.medida },
    { label: "Resolución", value: slide.resolucion },
    { label: "Encendido", value: slide.encendido },
    { label: "Exposición", value: slide.exposicion },
  ].filter((r) => r.value?.trim());

  return (
    <div className="flex aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background shadow-[var(--shadow-sm)]">
      <div className="relative w-[55%] bg-surface-secondary">
        {slide.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={slide.unitName}
            className="h-full w-full object-cover"
            src={slide.imageUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>
      <div className="flex w-[45%] flex-col justify-center gap-3 bg-card p-5 sm:p-6">
        {slide.providerName ? (
          <p className="text-xs font-semibold text-led">{slide.providerName}</p>
        ) : null}
        <div>
          <p className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {slide.slideTitle}
          </p>
          {slide.location ? (
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{slide.location}</p>
          ) : null}
        </div>
        <dl className="space-y-2.5 border-t border-border pt-3">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-[11px] text-muted-foreground">{r.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function PresentationBuilder({ units }: { units: UnitCard[] }) {
  const { resolvedTheme } = useTheme();
  const [title, setTitle] = useState("Propuesta de paquetes pantallas LED");
  const [subtitle, setSubtitle] = useState(
    "Circuito integral de vía pública con nodos de alto tráfico en CABA y GBA.",
  );
  const [highlights, setHighlights] = useState<PresentationHighlight[]>(DEFAULT_HIGHLIGHTS);
  const [closingLine, setClosingLine] = useState(
    "Creamos conexiones que generan resultados",
  );
  const [contactLine, setContactLine] = useState(
    "admin@nextmedia.com.ar · nextmedia.com.ar",
  );
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [slides, setSlides] = useState<EditableSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewKind, setPreviewKind] = useState<"cover" | "unit" | "closing">("cover");
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          subtitle: subtitle.trim(),
          highlights: highlights.filter((h) => h.value.trim() || h.label.trim()),
          closingLine: closingLine.trim(),
          contactLines: contactLine
            .split("·")
            .map((l) => l.trim())
            .filter(Boolean),
          slides: slides.map((s) => ({
            unitId: s.unitId,
            slideTitle: s.slideTitle,
            location: s.location,
            medida: s.medida || undefined,
            encendido: s.encendido || undefined,
            exposicion: s.exposicion || undefined,
            resolucion: s.resolucion || undefined,
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
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(280px,340px)]">
        {/* Catálogo */}
        <section className={cn(surfaceCard(), "flex min-h-[18rem] flex-col gap-3 p-4 xl:min-h-0")}>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Carteles</h2>
            <p className="text-xs text-muted-foreground">
              {selectedIds.size} seleccionados · {filtered.length} visibles
            </p>
          </div>
          <input
            className={fieldClass}
            placeholder="Buscar por nombre, zona o medio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className={cn(fieldClass, "nm-select")}
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
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
            {filtered.slice(0, 200).map((u) => {
              const selected = selectedIds.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUnit(u)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all",
                    selected
                      ? "border-led/50 bg-led/8"
                      : "border-border bg-muted/30 hover:border-led/20",
                  )}
                >
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {u.imageUrls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={u.imageUrls[0]} />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{u.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
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
        <section className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
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
                  className={cn(btnSecondary, "px-2 py-1 text-xs")}
                  disabled={activeIndex <= 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                >
                  ←
                </button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {activeIndex + 1}/{slides.length}
                </span>
                <button
                  type="button"
                  className={cn(btnSecondary, "px-2 py-1 text-xs")}
                  disabled={activeIndex >= slides.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(slides.length - 1, i + 1))}
                >
                  →
                </button>
              </div>
            ) : null}
          </div>

          <SlidePreview
            kind={previewKind}
            title={title}
            subtitle={subtitle}
            highlights={highlights}
            slide={activeSlide}
            closingLine={closingLine}
            contactLines={contactLine
              .split("·")
              .map((l) => l.trim())
              .filter(Boolean)}
          />

          <div className={cn(surfaceCard(), "grid gap-3 p-4 sm:grid-cols-2")}>
            {previewKind === "cover" ? (
              <>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Datos de portada
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="pres-title">
                    Título
                  </label>
                  <input
                    id="pres-title"
                    className={cn(fieldClass, "mt-1.5")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="pres-sub">
                    Subtítulo
                  </label>
                  <textarea
                    id="pres-sub"
                    className={cn(fieldClass, "mt-1.5 min-h-[64px] resize-none")}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                  />
                </div>
                {highlights.map((h, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Dato {i + 1}</label>
                      <input
                        className={cn(fieldClass, "mt-1.5")}
                        value={h.value}
                        onChange={(e) =>
                          setHighlights((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Etiqueta</label>
                      <input
                        className={cn(fieldClass, "mt-1.5")}
                        value={h.label}
                        onChange={(e) =>
                          setHighlights((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : null}

            {previewKind === "unit" ? (
              activeSlide ? (
                <>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Datos del cartel {activeIndex + 1} / {slides.length}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {activeSlide.unitName} · {activeSlide.providerName}
                    </p>
                  </div>
                  {(
                    [
                      ["slideTitle", "Título slide"],
                      ["location", "Ubicación"],
                      ["medida", "Medida"],
                      ["resolucion", "Resolución"],
                      ["encendido", "Encendido"],
                      ["exposicion", "Exposición"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className={key === "slideTitle" || key === "location" ? "sm:col-span-2" : undefined}>
                      <label className={labelClass} htmlFor={`slide-${key}`}>
                        {label}
                      </label>
                      <input
                        id={`slide-${key}`}
                        className={cn(fieldClass, "mt-1.5")}
                        value={activeSlide[key] ?? ""}
                        onChange={(e) => updateActiveSlide({ [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <p className="sm:col-span-2 py-4 text-center text-sm text-muted-foreground">
                  Seleccioná un cartel del listado o del orden a la derecha para editar sus datos.
                </p>
              )
            ) : null}

            {previewKind === "closing" ? (
              <>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Datos de cierre
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="pres-closing">
                    Mensaje
                  </label>
                  <input
                    id="pres-closing"
                    className={cn(fieldClass, "mt-1.5")}
                    value={closingLine}
                    onChange={(e) => setClosingLine(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="pres-contact">
                    Contacto
                  </label>
                  <input
                    id="pres-contact"
                    className={cn(fieldClass, "mt-1.5")}
                    value={contactLine}
                    onChange={(e) => setContactLine(e.target.value)}
                    placeholder="email · web"
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>

        {/* Orden */}
        <section className={cn(surfaceCard(), "flex min-h-[18rem] flex-col gap-3 p-4 xl:min-h-0")}>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Orden{" "}
              <span className="font-normal text-muted-foreground">({slides.length})</span>
            </h2>
            {slides.length > 1 ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Arrastrá para reordenar
              </p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
            {slides.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
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
                  <div className="space-y-1.5">
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

      <div className="flex shrink-0 flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        {error ? (
          <p className="text-sm text-signal" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Exporta portada + {slides.length} carteles + cierre · PDF o PowerPoint
          </p>
        )}
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            className={cn(btnSecondary, "min-w-[8rem]")}
            disabled={!!exporting || slides.length === 0}
            onClick={() => exportDeck("pptx")}
          >
            {exporting === "pptx" ? "Generando…" : "Exportar PPTX"}
          </button>
          <button
            type="button"
            className={cn(btnPrimary, "min-w-[8rem]")}
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
