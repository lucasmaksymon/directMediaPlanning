export type PresentationHighlight = {
  value: string;
  label: string;
  /** Si false, no se muestra en portada / export. */
  enabled?: boolean;
};

/** cover = llena el panel (recorta); contain = imagen completa (bandas). Nunca deforma. */
export type PresentationImageFit = "cover" | "contain";

export type PresentationSlideInput = {
  unitId: string;
  slideTitle: string;
  location: string;
  zona?: string;
  medida?: string;
  visibilidad?: string;
  caras?: string;
  impacto?: string;
  impactoPeriodo?: "diario" | "semanal" | "mensual";
  frecuencia?: string;
  spot?: string;
  encendido?: string;
  resolucion?: string;
  pauta?: string;
  costoMensual?: string;
  mapsUrl?: string;
  imageFit?: PresentationImageFit;
};

export type PresentationExportRequest = {
  format: "pdf" | "pptx";
  title: string;
  titleHighlight?: string;
  eyebrow?: string;
  subtitle: string;
  highlights: PresentationHighlight[];
  slides: PresentationSlideInput[];
  closingLine?: string;
  closingLineAccent?: string;
  closingBadge?: string;
  contactAddress?: string;
  contactEmail?: string;
  contactWeb?: string;
  theme?: "light" | "dark";
};

export type PresentationSlideResolved = PresentationSlideInput & {
  imageUrl: string | null;
  imageSrc: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  providerName: string;
  unitName: string;
};

export type PresentationDeck = {
  title: string;
  titleHighlight: string;
  eyebrow: string;
  subtitle: string;
  highlights: PresentationHighlight[];
  slides: PresentationSlideResolved[];
  closingLine: string;
  closingLineAccent: string;
  closingBadge: string;
  contactAddress: string;
  contactEmail: string;
  contactWeb: string;
  generatedAt: string;
  theme: "light" | "dark";
};

export type InventoryUnitForPresentation = {
  id: string;
  name: string;
  locationLabel: string;
  description: string | null;
  imageUrls: string[];
  metadata: unknown;
  format: string;
  latitude?: number | null;
  longitude?: number | null;
  basePriceAmount?: string | null;
  provider: { companyName: string };
};
