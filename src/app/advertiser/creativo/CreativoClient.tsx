"use client";

import { useState } from "react";
import Image from "next/image";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { btnPrimary, btnSecondary, fieldClass, labelClass, surfaceCard } from "@/lib/ui-classes";

type Unit = { id: string; name: string; locationLabel: string; format: string; description?: string | null };

type ValidationResult = {
  score: number;
  approved: boolean;
  issues: string[];
  suggestions: string[];
  summary: string;
};

type MockupData = {
  description: string;
  environment: string;
  dimensions: string;
  bestTime: string;
  imagePrompt: string;
};

const FORMAT_LABEL: Record<string, string> = {
  digital_ooh: "LED Digital",
  static_ooh: "OOH estático",
  digital_package: "Pack digital",
};

function ScoreBadge({ score, approved }: { score: number; approved: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-bold",
        score >= 80
          ? "bg-led/15 text-led"
          : score >= 60
            ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300"
            : "bg-signal/15 text-signal",
      )}
    >
      <span>{score}/100</span>
      <span>{approved ? "✓ Aprobado" : "✗ Revisar"}</span>
    </div>
  );
}

export function CreativoClient({ units }: { units: Unit[] }) {
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [mockupData, setMockupData] = useState<MockupData | null>(null);
  const [validating, setValidating] = useState(false);
  const [mocking, setMocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUnit = units.find((u) => u.id === selectedUnitId);
  const hasResults = Boolean(validation || mockupUrl || mockupData);

  async function handleValidate() {
    if (!imageUrl || !selectedUnit) {
      setError("Seleccioná un espacio e ingresá la URL del arte.");
      return;
    }
    setValidating(true);
    setError(null);
    setValidation(null);
    try {
      const res = await fetch("/api/ai/creative-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          unitFormat: selectedUnit.format,
          unitName: selectedUnit.name,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setValidation(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al validar.");
    } finally {
      setValidating(false);
    }
  }

  async function handleMockup() {
    if (!selectedUnit) {
      setError("Seleccioná un espacio.");
      return;
    }
    if (!imageUrl) {
      setError("Pegá la URL de tu arte antes de generar el mockup.");
      return;
    }
    setMocking(true);
    setError(null);
    setMockupUrl(null);
    setMockupData(null);
    try {
      const res = await fetch("/api/ai/creative-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationLabel: selectedUnit.locationLabel,
          unitName: selectedUnit.name,
          unitFormat: selectedUnit.format,
          description: selectedUnit.description,
          creativeImageUrl: imageUrl,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.imageUrl) {
        setMockupUrl(data.imageUrl);
      } else if (data.mockup) {
        setMockupData(data.mockup);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar mockup.");
    } finally {
      setMocking(false);
    }
  }

  return (
    <div className="grid gap-6 pb-4 lg:grid-cols-2 lg:items-start">
      <div className="space-y-5">
        <div className={cn(surfaceCard(), "space-y-5 p-5 sm:p-6")}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Paso 1
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Seleccioná el espacio</h2>
          </div>
          <div>
            <label className={labelClass} htmlFor="unit-select">
              Espacio publicitario
            </label>
            <Select
              id="unit-select"
              className="mt-1.5"
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
            >
              <option value="">— Seleccioná un espacio —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.locationLabel}
                </option>
              ))}
            </Select>
            {selectedUnit && (
              <p className="mt-2 text-xs text-muted-foreground">
                Formato: {FORMAT_LABEL[selectedUnit.format] ?? selectedUnit.format}
              </p>
            )}
          </div>
        </div>

        <div className={cn(surfaceCard(), "space-y-5 p-5 sm:p-6")}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Paso 2
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Subí tu arte</h2>
          </div>
          <div>
            <label className={labelClass} htmlFor="image-url">
              URL de la imagen del arte
            </label>
            <input
              id="image-url"
              className={cn(fieldClass, "mt-1.5")}
              placeholder="https://ejemplo.com/arte-final.jpg"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Subí la imagen a un host público (Drive, Dropbox, etc.) y pegá la URL directa.
            </p>
          </div>

          {imageUrl && (
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-muted/50">
              <Image
                src={imageUrl}
                alt="Vista previa del arte"
                fill
                className="object-contain p-2"
                unoptimized
                onError={() =>
                  setError("No se pudo cargar la imagen. Verificá que la URL sea pública.")
                }
              />
            </div>
          )}

          {error && (
            <p
              className="rounded-xl border border-signal/30 bg-signal/10 px-3 py-2 text-sm text-signal"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              className={cn(btnPrimary)}
              disabled={validating || !imageUrl || !selectedUnitId}
              onClick={handleValidate}
              type="button"
            >
              {validating ? "Validando…" : "✦ Validar con IA"}
            </button>
            <button
              className={cn(btnSecondary)}
              disabled={mocking || !selectedUnitId || !imageUrl}
              onClick={handleMockup}
              type="button"
              title={!imageUrl ? "Subí la URL de tu arte primero" : undefined}
            >
              {mocking ? "Generando…" : "Mockup con mi arte"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 lg:sticky lg:top-0">
        {validation && (
          <div className={cn(surfaceCard(), "space-y-4 p-5 sm:p-6")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Análisis del creativo</h2>
              <ScoreBadge score={validation.score} approved={validation.approved} />
            </div>

            <p className="text-sm leading-relaxed text-foreground">{validation.summary}</p>

            {validation.issues.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-signal">
                  Problemas detectados
                </p>
                <ul className="space-y-1.5">
                  {validation.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="shrink-0 text-signal">✗</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validation.suggestions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-led">
                  Sugerencias de mejora
                </p>
                <ul className="space-y-1.5">
                  {validation.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="shrink-0 text-led">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {mockupUrl && (
          <div className={cn(surfaceCard(), "space-y-3 p-5 sm:p-6")}>
            <h2 className="text-base font-semibold text-foreground">Mockup generado por IA</h2>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
              {mockupUrl.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mockupUrl}
                  alt="Mockup del espacio"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={mockupUrl}
                  alt="Mockup del espacio"
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Representación orientativa generada con IA. No reemplaza la aprobación final del medio.
            </p>
          </div>
        )}

        {mockupData && (
          <div className={cn(surfaceCard(), "space-y-4 p-5 sm:p-6")}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Descripción del espacio por IA</h2>
              <span className="rounded-full bg-led/10 px-2.5 py-0.5 text-xs font-semibold text-led">✦ IA</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visualización del entorno</p>
                <p className="text-foreground">{mockupData.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entorno urbano</p>
                  <p className="text-foreground">{mockupData.environment}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dimensiones</p>
                  <p className="text-foreground">{mockupData.dimensions}</p>
                </div>
              </div>

              <div className="rounded-xl bg-led/5 border border-led/20 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-led">Mejor horario de impacto</p>
                <p className="text-foreground">{mockupData.bestTime}</p>
              </div>

              <details className="rounded-xl border border-border">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                  Prompt para Midjourney / DALL-E
                </summary>
                <div className="border-t border-border px-3 py-2">
                  <p className="font-mono text-xs leading-relaxed text-foreground">{mockupData.imagePrompt}</p>
                </div>
              </details>
            </div>

            <p className="text-xs text-muted-foreground">
              Descripción orientativa generada con IA. Podés usar el prompt para crear imágenes en Midjourney, DALL-E o Canva.
            </p>
          </div>
        )}

        {!hasResults && (
          <div
            className={cn(
              surfaceCard(),
              "flex min-h-[min(360px,50vh)] flex-col items-center justify-center gap-3 p-8 text-center",
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-led/10 text-xl text-led">
              ✦
            </span>
            <p className="max-w-xs text-sm text-muted-foreground">
              Seleccioná un espacio, pegá la URL de tu arte y hacé clic en{" "}
              <span className="font-semibold text-foreground">Validar con IA</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
