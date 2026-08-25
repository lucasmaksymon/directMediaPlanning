"use client";

import { useRef, useState } from "react";
import { createBatchReservations } from "@/app/actions/reservation";
import { cn } from "@/lib/cn";
import { btnPrimary } from "@/lib/ui-classes";

type Message = { role: "user" | "assistant"; content: string };

type UnitDetail = {
  id: string;
  name: string;
  locationLabel: string;
  basePriceAmount: string;
  format: string;
  providerName: string;
};

type Props = { unitDetails?: UnitDetail[] };

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Hola! Soy tu planificador de campañas OOH. Contame sobre tu campaña: ¿qué querés comunicar, en qué zona y con qué presupuesto? También decime las fechas aproximadas.",
};

/* ── Helpers ── */

function extractUnitIds(text: string): string[] {
  // Captura TODOS los bloques [[id1,id2,...]] o [[id]] individuales
  const matches = [...text.matchAll(/\[\[([^\]]+)\]\]/g)];
  if (!matches.length) return [];
  const ids = matches.flatMap((m) => m[1].split(",").map((id) => id.trim()).filter(Boolean));
  // Deduplicar manteniendo orden
  return [...new Set(ids)];
}

function extractDates(messages: Message[]): { fechaInicio?: string; fechaFin?: string } {
  const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
  const allText = messages.map((m) => m.content).join(" ");
  const matches = allText.match(dateRegex) ?? [];
  return { fechaInicio: matches[0], fechaFin: matches[1] };
}

const FORMAT_LABEL: Record<string, string> = {
  digital_ooh: "LED Digital",
  static_ooh: "Valla Estática",
  digital_package: "Pack Digital",
};

const FORMAT_ICON: Record<string, string> = {
  digital_ooh: "▶",
  static_ooh: "◼",
  digital_package: "◈",
};

/* ── Markdown renderer (sin dependencias extra) ── */

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

function MarkdownMessage({ content }: { content: string }) {
  // Quita bloques [[...]] y líneas que queden vacías o solo con "ID:" / "- ID:"
  const clean = content
    .replace(/\[\[[^\]]*\]\]/g, "")
    .split("\n")
    .filter((l) => !/^\s*[-*]?\s*ID\s*:\s*$/.test(l))
    .join("\n")
    .trim();
  const lines = clean.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuffer: React.ReactNode[] = [];
  let listType: "ol" | "ul" | null = null;

  function flushList() {
    if (!listBuffer.length) return;
    const List = listType === "ol" ? "ol" : "ul";
    nodes.push(
      <List key={`list-${nodes.length}`} className={cn("mt-2 space-y-1.5", listType === "ol" ? "list-none" : "list-none")}>
        {listBuffer}
      </List>
    );
    listBuffer = [];
    listType = null;
  }

  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) { flushList(); return; }

    const olMatch = t.match(/^(\d+)\.\s+(.+)/);
    const ulMatch = t.match(/^[-*]\s+(.+)/);
    const h2Match = t.match(/^#{1,2}\s+(.+)/);

    if (h2Match) {
      flushList();
      nodes.push(
        <p key={i} className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {h2Match[1]}
        </p>
      );
    } else if (olMatch) {
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-0.5 shrink-0 min-w-[1.2rem] font-bold text-led text-xs">{olMatch[1]}.</span>
          <span className="text-foreground/90">{renderInline(olMatch[2])}</span>
        </li>
      );
    } else if (ulMatch) {
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-led/70" />
          <span className="text-foreground/90">{renderInline(ulMatch[1])}</span>
        </li>
      );
    } else {
      flushList();
      nodes.push(
        <p key={i} className="text-sm leading-relaxed text-foreground/90">
          {renderInline(t)}
        </p>
      );
    }
  });

  flushList();
  return <div className="space-y-1">{nodes}</div>;
}

/* ── Tarjeta de unidad recomendada ── */

function UnitCard({
  unit,
  index,
  selected,
  onToggle,
}: {
  unit: UnitDetail;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const price = Number(unit.basePriceAmount);
  const priceStr = price >= 1_000_000
    ? `$${(price / 1_000_000).toFixed(1)}M`
    : `$${Math.round(price / 1000)}k`;
  const icon = FORMAT_ICON[unit.format] ?? "◆";
  const label = FORMAT_LABEL[unit.format] ?? unit.format;

  return (
    <button
      type="button"
      onClick={() => onToggle(unit.id)}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-led/60 bg-led/8 shadow-[0_0_0_1px_rgba(0,182,199,0.3)]"
          : "border-border bg-card hover:border-led/30 hover:bg-led/5",
      )}
    >
      {/* Checkbox circular */}
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          selected
            ? "border-led bg-led text-black"
            : "border-border bg-card text-transparent group-hover:border-led/50",
        )}
      >
        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1,4 3.5,6.5 9,1" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("truncate text-xs font-semibold leading-snug transition-colors", selected ? "text-foreground" : "text-foreground/80")}>
            {index + 1}. {unit.name}
          </p>
          <span className={cn("shrink-0 text-xs font-bold transition-colors", selected ? "text-led" : "text-muted-foreground")}>
            {priceStr}<span className="font-normal text-muted-foreground">/sem</span>
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{unit.locationLabel}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <span className="text-led/70">{icon}</span> {label}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ── Mensaje del asistente ── */

function AssistantMessage({
  content,
  isStreaming,
  recommendedUnits,
  selectedIds,
  onToggle,
}: {
  content: string;
  isStreaming: boolean;
  recommendedUnits: UnitDetail[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Avatar IA */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-led/10 text-led text-xs font-bold mt-0.5">
        ✦
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {/* Burbuja de texto */}
        <div className="rounded-2xl rounded-tl-sm border border-border bg-muted/50 px-4 py-3">
          {content ? (
            <MarkdownMessage content={content} />
          ) : isStreaming ? (
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-led/60 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-led/60 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-led/60 [animation-delay:300ms]" />
            </span>
          ) : null}
        </div>

        {/* Tarjetas de unidades recomendadas */}
        {recommendedUnits.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {recommendedUnits.map((u, i) => (
              <UnitCard
                key={u.id}
                unit={u}
                index={i}
                selected={selectedIds.has(u.id)}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Componente principal ── */

export function ChatPlanner({ unitDetails = [] }: Props) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [reserveOk, setReserveOk] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const unitMap = Object.fromEntries(unitDetails.map((u) => [u.id, u]));

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const recommendedIds = lastAssistant ? extractUnitIds(lastAssistant.content) : [];
  const recommendedUnits = recommendedIds.map((id) => unitMap[id]).filter(Boolean) as UnitDetail[];

  // Cuando llegan nuevas recomendaciones, pre-seleccionarlas todas
  const prevRecommendedRef = useRef<string>("");
  const recommendedKey = recommendedIds.join(",");
  if (recommendedKey !== prevRecommendedRef.current && recommendedIds.length > 0) {
    prevRecommendedRef.current = recommendedKey;
    setSelectedIds(new Set(recommendedIds));
  }

  function toggleUnit(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedUnits = recommendedUnits.filter((u) => selectedIds.has(u.id));
  const totalPrice = selectedUnits.reduce((acc, u) => acc + Number(u.basePriceAmount), 0);
  const totalStr = totalPrice >= 1_000_000
    ? `$${(totalPrice / 1_000_000).toFixed(2)}M`
    : `$${Math.round(totalPrice / 1000)}k`;

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/planner-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) throw new Error("Error del servidor");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const { text: chunk } = JSON.parse(data);
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + chunk };
              }
              return updated;
            });
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = { ...last, content: "Hubo un error al consultar la IA. Intentá de nuevo." };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 50);
    }
  }

  async function handleReserve() {
    if (selectedIds.size === 0) return;
    const { fechaInicio, fechaFin } = extractDates(messages);
    if (!fechaInicio || !fechaFin) {
      alert("No pude detectar las fechas en la conversación. Mencioná las fechas en formato AAAA-MM-DD.");
      return;
    }
    setReserving(true);
    try {
      const res = await createBatchReservations([...selectedIds], fechaInicio, fechaFin);
      if (res.ok) setReserveOk(true);
      else alert(res.error);
    } finally {
      setReserving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card ">

      {/* ── Mensajes ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 space-y-5">
        {messages.map((msg, i) => {
          const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;
          const showCards = isLastAssistant && !streaming && recommendedUnits.length > 0;

          if (msg.role === "assistant") {
            return (
              <AssistantMessage
                key={i}
                content={msg.content}
                isStreaming={streaming && isLastAssistant}
                recommendedUnits={showCards ? recommendedUnits : []}
                selectedIds={selectedIds}
                onToggle={toggleUnit}
              />
            );
          }

          return (
            <div key={i} className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Barra de reserva ── */}
      {recommendedUnits.length > 0 && !reserveOk && (
        <div className="shrink-0 border-t border-border bg-card/95 px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                <span className={selectedUnits.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                  {selectedUnits.length} de {recommendedUnits.length} espacios seleccionados
                </span>
                {selectedUnits.length > 0 && (
                  <>
                    <span className="ml-2 font-normal text-muted-foreground">· Total:</span>
                    <span className="ml-1 font-bold text-led">{totalStr}/sem</span>
                  </>
                )}
              </p>
            </div>
            <button
              className={cn(
                "shrink-0 text-xs px-4 py-2 rounded-xl font-semibold transition",
                selectedUnits.length > 0 && !reserving && !streaming
                  ? btnPrimary
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
              disabled={selectedUnits.length === 0 || reserving || streaming}
              onClick={handleReserve}
              type="button"
            >
              {reserving ? "Reservando…" : "Reservar seleccionados →"}
            </button>
          </div>
        </div>
      )}

      {reserveOk && (
        <div className="shrink-0 border-t border-border bg-led/10 px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-led">
            ✓ Solicitudes enviadas.{" "}
            <a href="/advertiser" className="underline underline-offset-2">Ver mis solicitudes →</a>
          </p>
        </div>
      )}

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-border bg-card/95 p-4 sm:px-5">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-2 focus-within:border-led/50 transition">
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder={streaming ? "Escribiendo…" : "Describí tu campaña o respondé la pregunta…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
            disabled={streaming}
          />
          <button
            className={cn(
              "shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition",
              input.trim() && !streaming
                ? "bg-led text-black hover:bg-led/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
            disabled={!input.trim() || streaming}
            onClick={sendMessage}
            type="button"
          >
            {streaming ? (
              <span className="flex gap-1">
                <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:100ms]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:200ms]" />
              </span>
            ) : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
