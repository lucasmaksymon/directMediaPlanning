"use client";

import { useState } from "react";
import Image from "next/image";
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

export function CreativoClient({ units }: { units: Unit[] }) {
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [mocking, setMocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUnit = units.find((u) => u.id === selectedUnitId);

  async function handleValidate() {
    if (!imageUrl || !selectedUnit) { setError("Seleccioná un espacio e ingresá la URL del arte."); return; }
    setValidating(true); setError(null); setValidation(null);
    try {
      const res = await fetch("/api/ai/creative-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, unitFormat: selectedUnit.format, unitName: selectedUnit.name }),
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
    if (!selectedUnit) { setError("Seleccioná un espacio."); return; }
    setMocking(true); setError(null); setMockupUrl(null);
    try {
      const res = await fetch("/api/ai/creative-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationLabel: selectedUnit.locationLabel,
          unitName: selectedUnit.name,
          unitFormat: selectedUnit.format,
          description: selectedUnit.description,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMockupUrl(data.imageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar mockup.");
    } finally {
      setMocking(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Panel de entrada */}
      <div className="space-y-5">
        <div className={cn(surfaceCard(), "p-5 sm:p-6 space-y-5")}>
          <h2 className="text-base font-semibold text-foreground">1. Seleccioná el espacio</h2>
          <div>
            <label className={labelClass} htmlFor="unit-select">Espacio publicitario</label>
            <select
              id="unit-select"
              className={cn(fieldClass, "mt-1.5")}
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
            >
              <option value="">— Seleccioná un espacio —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name} · {u.locationLabel}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={cn(surfaceCard(), "p-5 sm:p-6 space-y-5")}>
          <h2 className="text-base font-semibold text-foreground">2. Subí tu arte</h2>
          <div>
            <label className={labelClass} htmlFor="image-url">URL de la imagen del arte</label>
            <input
              id="image-url"
              className={cn(fieldClass, "mt-1.5")}
              placeholder="https://ejemplo.com/arte-final.jpg"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Subí la imagen a cualquier host (Google Drive, Dropbox, etc.) y pegá la URL pública.</p>
          </div>

          {imageUrl && (
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-border bg-muted">
              <Image src={imageUrl} alt="Arte" fill className="object-contain" unoptimized onError={() => setError("No se pudo cargar la imagen. Verificá la URL.")} />
            </div>
          )}

          {error && <p className="text-sm text-signal" role="alert">{error}</p>}

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
              disabled={mocking || !selectedUnitId}
              onClick={handleMockup}
              type="button"
            >
              {mocking ? "Generando…" : "Generar mockup"}
            </button>
          </div>
        </div>
      </div>

      {/* Panel de resultados */}
      <div className="space-y-5">
        {validation && (
          <div className={cn(surfaceCard(), "p-5 sm:p-6 space-y-4")}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Análisis del creativo</h2>
              <div className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold",
                validation.score >= 80 ? "bg-led/15 text-led" : validation.score >= 60 ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" : "bg-signal/15 text-signal",
              )}>
                <span>{validation.score}/100</span>
                <span>{validation.approved ? "✓ Aprobado" : "✗ Revisar"}</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-foreground">{validation.summary}</p>

            {validation.issues.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-signal mb-2">Problemas detectados</p>
                <ul className="space-y-1.5">
                  {validation.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="text-signal shrink-0">✗</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validation.suggestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-led mb-2">Sugerencias de mejora</p>
                <ul className="space-y-1.5">
                  {validation.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="text-led shrink-0">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {mockupUrl && (
          <div className={cn(surfaceCard(), "p-5 sm:p-6 space-y-3")}>
            <h2 className="text-base font-semibold text-foreground">Mockup generado por IA</h2>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border">
              <Image src={mockupUrl} alt="Mockup del espacio" fill className="object-cover" unoptimized />
            </div>
            <p className="text-xs text-muted-foreground">Generado con DALL-E 3. Es una representación artística orientativa.</p>
          </div>
        )}

        {!validation && !mockupUrl && (
          <div className={cn(surfaceCard(), "flex h-48 items-center justify-center p-5")}>
            <p className="text-center text-sm text-muted-foreground">
              Seleccioná un espacio, pegá la URL de tu arte y hacé click en "Validar con IA".
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
