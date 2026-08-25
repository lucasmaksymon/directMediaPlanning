import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { CLIENT_BRAND, PRODUCT_NAME } from "@/lib/brand";
import { coverRect, pdfImagePaneSize } from "@/lib/presentations/image-layout";
import { slideSpecRows } from "@/lib/presentations/slide-data";
import {
  getPresentationPalette,
  type PresentationPalette,
} from "@/lib/presentations/theme";
import type { PresentationDeck } from "@/lib/presentations/types";

function createStyles(p: PresentationPalette) {
  return StyleSheet.create({
    page: {
      backgroundColor: p.canvas,
      fontFamily: "Helvetica",
      position: "relative",
    },
    pageOcean: {
      backgroundColor: p.ocean,
      fontFamily: "Helvetica",
      position: "relative",
    },
    coverInner: {
      flex: 1,
      padding: 48,
      justifyContent: "space-between",
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    brandDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: p.led,
    },
    brand: {
      fontSize: 10,
      color: p.led,
      letterSpacing: 1.6,
      fontWeight: "bold",
    },
    coverTitle: {
      fontSize: 32,
      color: p.foreground,
      fontWeight: "bold",
      lineHeight: 1.2,
      marginTop: 20,
      maxWidth: "85%",
      letterSpacing: -0.5,
    },
    coverSubtitle: {
      fontSize: 12,
      color: p.muted,
      marginTop: 12,
      lineHeight: 1.5,
      maxWidth: "72%",
    },
    highlightRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 36,
    },
    highlightCard: {
      flex: 1,
      backgroundColor: p.card,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderLeftWidth: 3,
      borderLeftColor: p.led,
    },
    highlightValue: {
      fontSize: 20,
      color: p.led,
      fontWeight: "bold",
    },
    highlightLabel: {
      fontSize: 9,
      color: p.muted,
      marginTop: 4,
      letterSpacing: 0.4,
    },
    slideBody: {
      flex: 1,
      flexDirection: "row",
    },
    imagePane: {
      width: "55%",
      height: "100%",
      backgroundColor: p.surfaceSecondary,
      overflow: "hidden",
      position: "relative",
    },
    imagePlaceholder: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: p.surfaceSecondary,
    },
    specsPane: {
      width: "45%",
      height: "100%",
      paddingTop: 40,
      paddingBottom: 40,
      paddingLeft: 32,
      paddingRight: 32,
      justifyContent: "center",
      backgroundColor: p.card,
    },
    provider: {
      fontSize: 10,
      color: p.led,
      fontWeight: "bold",
      marginBottom: 6,
    },
    slideTitle: {
      fontSize: 18,
      color: p.foreground,
      fontWeight: "bold",
      letterSpacing: -0.3,
      marginBottom: 6,
      lineHeight: 1.25,
    },
    slideLocation: {
      fontSize: 11,
      color: p.muted,
      marginBottom: 22,
      lineHeight: 1.4,
    },
    specBlock: {
      marginBottom: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
    },
    specLabel: {
      fontSize: 9,
      color: p.muted,
      marginBottom: 3,
    },
    specValue: {
      fontSize: 12,
      color: p.foreground,
      lineHeight: 1.4,
      fontWeight: "bold",
    },
    closingInner: {
      flex: 1,
      padding: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    closingBrand: {
      fontSize: 14,
      color: p.led,
      fontWeight: "bold",
      letterSpacing: 2,
      marginBottom: 16,
    },
    closingProduct: {
      fontSize: 28,
      color: p.onDark,
      fontWeight: "bold",
      marginBottom: 14,
      letterSpacing: -0.4,
    },
    closingLine: {
      fontSize: 12,
      color: p.onDarkMuted,
      textAlign: "center",
      maxWidth: "70%",
      lineHeight: 1.5,
      marginBottom: 28,
    },
    contactLine: {
      fontSize: 10,
      color: p.onDarkMuted,
      marginTop: 4,
      textAlign: "center",
    },
    footer: {
      position: "absolute",
      bottom: 18,
      left: 32,
      right: 32,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    footerText: {
      fontSize: 8,
      color: p.muted,
    },
    footerTextOnDark: {
      fontSize: 8,
      color: p.onDarkMuted,
    },
  });
}

type Styles = ReturnType<typeof createStyles>;

function CoverPage({
  deck,
  styles,
}: {
  deck: PresentationDeck;
  styles: Styles;
}) {
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.coverInner}>
        <View>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brand}>{CLIENT_BRAND.toUpperCase()}</Text>
          </View>
          <Text style={styles.coverTitle}>{deck.title}</Text>
          {deck.subtitle ? <Text style={styles.coverSubtitle}>{deck.subtitle}</Text> : null}
          {deck.highlights.length > 0 ? (
            <View style={styles.highlightRow}>
              {deck.highlights.slice(0, 3).map((h, i) => (
                <View key={i} style={styles.highlightCard}>
                  <Text style={styles.highlightValue}>{h.value || "—"}</Text>
                  <Text style={styles.highlightLabel}>{h.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>{PRODUCT_NAME}</Text>
          <Text style={styles.footerText}>{deck.generatedAt}</Text>
        </View>
      </View>
    </Page>
  );
}

function UnitPage({
  slide,
  index,
  total,
  styles,
  palette,
}: {
  slide: PresentationDeck["slides"][number];
  index: number;
  total: number;
  styles: Styles;
  palette: PresentationPalette;
}) {
  const rows = slideSpecRows(slide).filter((r) => r.label !== "Ubicación");
  const pane = pdfImagePaneSize();
  const cover =
    slide.imageSrc && slide.imageWidth && slide.imageHeight
      ? coverRect(slide.imageWidth, slide.imageHeight, pane.width, pane.height)
      : null;

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.slideBody}>
        <View style={styles.imagePane}>
          {slide.imageSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image
            <Image
              src={slide.imageSrc}
              style={
                cover
                  ? {
                      position: "absolute",
                      left: cover.x,
                      top: cover.y,
                      width: cover.width,
                      height: cover.height,
                    }
                  : { width: "100%", height: "100%" }
              }
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ color: palette.muted, fontSize: 11 }}>Sin imagen</Text>
            </View>
          )}
        </View>
        <View style={styles.specsPane}>
          {slide.providerName ? (
            <Text style={styles.provider}>{slide.providerName}</Text>
          ) : null}
          <Text style={styles.slideTitle}>{slide.slideTitle}</Text>
          {slide.location ? (
            <Text style={styles.slideLocation}>{slide.location}</Text>
          ) : null}
          {rows.map((r, i) => (
            <View
              key={r.label}
              style={[
                styles.specBlock,
                i === rows.length - 1
                  ? { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }
                  : {},
              ]}
            >
              <Text style={styles.specLabel}>{r.label}</Text>
              <Text style={styles.specValue}>{r.value}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>{CLIENT_BRAND}</Text>
        <Text style={styles.footerText}>
          {index + 1} / {total}
        </Text>
      </View>
    </Page>
  );
}

function ClosingPage({
  deck,
  styles,
}: {
  deck: PresentationDeck;
  styles: Styles;
}) {
  return (
    <Page size="A4" orientation="landscape" style={styles.pageOcean}>
      <View style={styles.closingInner}>
        <Text style={styles.closingBrand}>{CLIENT_BRAND.toUpperCase()}</Text>
        <Text style={styles.closingProduct}>{PRODUCT_NAME}</Text>
        <Text style={styles.closingLine}>{deck.closingLine}</Text>
        {deck.contactLines.map((line, i) => (
          <Text key={i} style={styles.contactLine}>
            {line}
          </Text>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerTextOnDark}>{deck.generatedAt}</Text>
      </View>
    </Page>
  );
}

export function PresentationDocument({ deck }: { deck: PresentationDeck }) {
  const palette = getPresentationPalette(deck.theme);
  const styles = createStyles(palette);

  return (
    <Document title={deck.title} author={CLIENT_BRAND}>
      <CoverPage deck={deck} styles={styles} />
      {deck.slides.map((slide, i) => (
        <UnitPage
          key={`${slide.unitId}-${i}`}
          slide={slide}
          index={i}
          total={deck.slides.length}
          styles={styles}
          palette={palette}
        />
      ))}
      <ClosingPage deck={deck} styles={styles} />
    </Document>
  );
}
