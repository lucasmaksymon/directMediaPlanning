"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Monta los hijos solo en el cliente (después del primer paint).
 * Evita errores de hidratación cuando extensiones del navegador inyectan atributos
 * en el DOM antes de que React termine de hidratar (p. ej. bis_skin_checked).
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
