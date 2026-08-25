export type PresentationHighlight = {
  value: string;
  label: string;
};

export type PresentationSlideInput = {
  unitId: string;
  slideTitle: string;
  location: string;
  medida?: string;
  encendido?: string;
  exposicion?: string;
  resolucion?: string;
};

export type PresentationExportRequest = {
  format: "pdf" | "pptx";
  title: string;
  subtitle: string;
  highlights: PresentationHighlight[];
  slides: PresentationSlideInput[];
  closingLine?: string;
  contactLines?: string[];
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
  subtitle: string;
  highlights: PresentationHighlight[];
  slides: PresentationSlideResolved[];
  closingLine: string;
  contactLines: string[];
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
  provider: { companyName: string };
};
