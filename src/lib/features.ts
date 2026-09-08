export function isProgrammaticEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_PROGRAMMATIC === "true";
}

export function isCmsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_CMS === "true";
}
