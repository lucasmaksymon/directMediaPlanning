"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type TableSortDir = "asc" | "desc";
export type TableSort = { id: string; dir: TableSortDir };

export type TablePin = "start" | "end";

type Stored = {
  order?: string[];
  hidden?: string[];
  pinStart?: string[];
  pinEnd?: string[];
  sortId?: string;
  sortDir?: TableSortDir;
};

function knownIds(ids: string[] | undefined, canonical: string[]) {
  return (ids ?? []).filter((id) => canonical.includes(id));
}

function reorderIfBoth(list: string[], activeId: string, overId: string) {
  const from = list.indexOf(activeId);
  const to = list.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  next.splice(from, 1);
  next.splice(to, 0, activeId);
  return next;
}

function mergeOrder(canonical: string[], saved?: string[]) {
  const known = (saved ?? []).filter((id) => canonical.includes(id));
  const missing = canonical.filter((id) => !known.includes(id));
  return [...known, ...missing];
}

export function useTablePrefs(storageKey: string, columnIds: readonly string[]) {
  const idKey = columnIds.join("|");
  const canonical = useMemo(() => idKey.split("|"), [idKey]);
  const [ready, setReady] = useState(false);
  const [order, setOrder] = useState<string[]>(canonical);
  const [hidden, setHidden] = useState<string[]>([]);
  const [pinStart, setPinStart] = useState<string[]>([]);
  const [pinEnd, setPinEnd] = useState<string[]>([]);
  const [sort, setSort] = useState<TableSort | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        setOrder(mergeOrder(canonical, parsed.order));
        setHidden((parsed.hidden ?? []).filter((id) => canonical.includes(id)));
        setPinStart(knownIds(parsed.pinStart, canonical));
        setPinEnd(knownIds(parsed.pinEnd, canonical));
        if (parsed.sortId && canonical.includes(parsed.sortId)) {
          setSort({ id: parsed.sortId, dir: parsed.sortDir === "desc" ? "desc" : "asc" });
        }
      } else {
        setOrder(canonical);
      }
    } catch {
      setOrder(canonical);
    }
    setReady(true);
  }, [storageKey, canonical]);

  useEffect(() => {
    if (!ready) return;
    const payload: Stored = {
      order,
      hidden,
      pinStart,
      pinEnd,
      sortId: sort?.id,
      sortDir: sort?.dir,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [hidden, order, pinEnd, pinStart, ready, sort, storageKey]);

  const visibleIds = useMemo(() => {
    const next = order.filter((id) => !hidden.includes(id));
    return next.length ? next : canonical.slice(0, 1);
  }, [canonical, hidden, order]);

  const toggleHidden = useCallback((id: string) => {
    setHidden((prev) => {
      const isHidden = prev.includes(id);
      if (!isHidden && order.filter((col) => !prev.includes(col)).length <= 1) return prev;
      return isHidden ? prev.filter((col) => col !== id) : [...prev, id];
    });
  }, [order]);

  const move = useCallback((activeId: string, overId: string) => {
    setOrder((prev) => reorderIfBoth(prev, activeId, overId));
    setPinStart((prev) => reorderIfBoth(prev, activeId, overId));
    setPinEnd((prev) => reorderIfBoth(prev, activeId, overId));
  }, []);

  const setPin = useCallback((id: string, side: TablePin | null) => {
    setPinStart((prev) => {
      const next = prev.filter((col) => col !== id);
      return side === "start" ? [...next, id] : next;
    });
    setPinEnd((prev) => {
      const next = prev.filter((col) => col !== id);
      return side === "end" ? [...next, id] : next;
    });
  }, []);

  const toggleSort = useCallback((id: string) => {
    setSort((prev) => {
      if (!prev || prev.id !== id) return { id, dir: "asc" };
      if (prev.dir === "asc") return { id, dir: "desc" };
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    setOrder(canonical);
    setHidden([]);
    setPinStart([]);
    setPinEnd([]);
    setSort(null);
  }, [canonical]);

  const displayIds = useMemo(() => {
    const visible = new Set(visibleIds);
    const start = pinStart.filter((id) => visible.has(id));
    const end = pinEnd.filter((id) => visible.has(id));
    const pinned = new Set([...start, ...end]);
    return [...start, ...visibleIds.filter((id) => !pinned.has(id)), ...end];
  }, [pinEnd, pinStart, visibleIds]);

  const pinOf = useCallback(
    (id: string): TablePin | null => {
      if (pinStart.includes(id)) return "start";
      if (pinEnd.includes(id)) return "end";
      return null;
    },
    [pinEnd, pinStart],
  );

  return {
    displayIds,
    hidden,
    move,
    order,
    pinEnd,
    pinOf,
    pinStart,
    ready,
    reset,
    setPin,
    sort,
    toggleHidden,
    toggleSort,
    visibleIds,
  };
}

export function compareTableValues(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (a == null && b == null) return 0;
  if (a == null || a === "") return 1;
  if (b == null || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}
