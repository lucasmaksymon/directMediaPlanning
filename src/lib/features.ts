export function isProgrammaticEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_PROGRAMMATIC === "true";
}

export function isCmsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_CMS === "true";
}

/** Mockup de arte del cliente sobre carteles en Presentaciones. Off por defecto. */
export function isPresentationMockupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_PRESENTATION_MOCKUP === "true";
}
