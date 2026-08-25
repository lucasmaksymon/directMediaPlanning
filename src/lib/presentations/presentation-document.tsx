import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from "@react-pdf/renderer";
import { CLIENT_BRAND } from "@/lib/brand";
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
      paddingTop: 40,
      paddingBottom: 40,
      paddingLeft: 48,
      paddingRight: 48,
      justifyContent: "space-between",
    },
    coverTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    coverEyebrow: {
      borderWidth: 1,
      borderColor: p.led,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    coverEyebrowText: {
      fontSize: 9,
      color: p.led,
      letterSpacing: 1.4,
      fontWeight: "bold",
    },
    coverLogo: {
      fontSize: 12,
      color: p.onDark,
      fontWeight: "bold",
      letterSpacing: 0.4,
    },
    coverBody: {
      marginTop: 48,
      maxWidth: "78%",
    },
    coverTitle: {
      fontSize: 34,
      color: p.onDark,
      fontWeight: "bold",
      lineHeight: 1.15,
      letterSpacing: -0.6,
    },
    coverTitleAccent: {
      fontSize: 34,
      color: p.led,
      fontWeight: "bold",
      lineHeight: 1.15,
      letterSpacing: -0.6,
      marginTop: 2,
    },
    coverSubtitle: {
      fontSize: 12,
      color: p.onDarkMuted,
      marginTop: 16,
      lineHeight: 1.5,
      maxWidth: "88%",
    },
    highlightRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 40,
    },
    highlightCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: p.led,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: "transparent",
    },
    highlightValue: {
      fontSize: 22,
      color: p.led,
      fontWeight: "bold",
    },
    highlightLabel: {
      fontSize: 10,
      color: p.onDark,
      marginTop: 4,
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
      paddingTop: 36,
      paddingBottom: 36,
      paddingLeft: 28,
      paddingRight: 24,
      justifyContent: "center",
      backgroundColor: p.card,
    },
    zonaPill: {
      alignSelf: "flex-start",
      backgroundColor: p.surfaceSecondary,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginBottom: 10,
    },
    zonaText: {
      fontSize: 9,
      color: p.led,
      fontWeight: "bold",
    },
    provider: {
      fontSize: 10,
      color: p.led,
      fontWeight: "bold",
      marginBottom: 6,
    },
    slideTitle: {
      fontSize: 16,
      color: p.foreground,
      fontWeight: "bold",
      letterSpacing: -0.3,
      marginBottom: 14,
      lineHeight: 1.25,
    },
    slideLocation: {
      fontSize: 11,
      color: p.muted,
      marginBottom: 22,
      lineHeight: 1.4,
    },
    specBlock: {
      marginBottom: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: p.border,
      flexDirection: "row",
      gap: 8,
    },
    specLabel: {
      fontSize: 9,
      color: p.led,
      fontWeight: "bold",
      width: 72,
    },
    specValue: {
      fontSize: 10,
      color: p.foreground,
      lineHeight: 1.35,
      flex: 1,
    },
    specLink: {
      fontSize: 10,
      color: p.led,
      lineHeight: 1.35,
      flex: 1,
      textDecoration: "underline",
    },
    closingInner: {
      flex: 1,
      padding: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    closingBadgeWrap: {
      position: "absolute",
      top: 36,
      right: 40,
      borderWidth: 1,
      borderColor: p.led,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    closingBadgeText: {
      fontSize: 9,
      color: p.led,
      fontWeight: "bold",
      letterSpacing: 0.6,
    },
    closingSlogan: {
      fontSize: 28,
      color: p.onDark,
      fontWeight: "bold",
      textAlign: "center",
      letterSpacing: -0.4,
      lineHeight: 1.15,
    },
    closingSloganAccent: {
      fontSize: 28,
      color: p.led,
      fontWeight: "bold",
      textAlign: "center",
      letterSpacing: -0.4,
      lineHeight: 1.15,
      marginTop: 4,
      marginBottom: 28,
    },
    contactCard: {
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 22,
      minWidth: 360,
      maxWidth: "70%",
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    contactBullet: {
      fontSize: 10,
      color: p.led,
      width: 12,
    },
    contactText: {
      fontSize: 10,
      color: p.onDark,
      flex: 1,
    },
    contactTextAccent: {
      fontSize: 10,
      color: p.led,
      flex: 1,
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
    <Page size="A4" orientation="landscape" style={styles.pageOcean}>
      <View style={styles.coverInner}>
        <View>
          <View style={styles.coverTopRow}>
            {deck.eyebrow ? (
              <View style={styles.coverEyebrow}>
                <Text style={styles.coverEyebrowText}>{deck.eyebrow.toUpperCase()}</Text>
              </View>
            ) : (
              <View />
            )}
            <Text style={styles.coverLogo}>{CLIENT_BRAND}</Text>
          </View>
          <View style={styles.coverBody}>
            <Text style={styles.coverTitle}>{deck.title}</Text>
            {deck.titleHighlight ? (
              <Text style={styles.coverTitleAccent}>{deck.titleHighlight}</Text>
            ) : null}
            {deck.subtitle ? <Text style={styles.coverSubtitle}>{deck.subtitle}</Text> : null}
          </View>
        </View>
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
  const rows = slideSpecRows(slide).map((r) =>
    r.label === "Mapa"
      ? { label: r.label, value: "Ver en Google Maps", href: r.value }
      : { label: r.label, value: r.value, href: undefined as string | undefined },
  );
  const pane = pdfImagePaneSize();
  const cover =
    slide.imageSrc && slide.imageWidth && slide.imageHeight
      ? coverRect(slide.imageWidth, slide.imageHeight, pane.width, pane.height)
      : null;

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.slideBody}>
        <View style={styles.specsPane}>
          {slide.zona ? (
            <View style={styles.zonaPill}>
              <Text style={styles.zonaText}>{slide.zona}</Text>
            </View>
          ) : slide.providerName ? (
            <Text style={styles.provider}>{slide.providerName}</Text>
          ) : null}
          <Text style={styles.slideTitle}>{slide.slideTitle}</Text>
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
              {r.href ? (
                <Link src={r.href} style={styles.specLink}>
                  {r.value}
                </Link>
              ) : (
                <Text style={styles.specValue}>{r.value}</Text>
              )}
            </View>
          ))}
        </View>
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
      {deck.closingBadge ? (
        <View style={styles.closingBadgeWrap}>
          <Text style={styles.closingBadgeText}>{deck.closingBadge}</Text>
        </View>
      ) : null}
      <View style={styles.closingInner}>
        <Text style={styles.closingSlogan}>{deck.closingLine.toUpperCase()}</Text>
        <Text style={styles.closingSloganAccent}>
          {deck.closingLineAccent.toUpperCase()}
        </Text>
        <View style={styles.contactCard}>
          {deck.contactAddress ? (
            <View style={styles.contactRow}>
              <Text style={styles.contactBullet}>•</Text>
              <Text style={styles.contactText}>{deck.contactAddress}</Text>
            </View>
          ) : null}
          {deck.contactEmail ? (
            <View style={styles.contactRow}>
              <Text style={styles.contactBullet}>•</Text>
              <Text style={styles.contactTextAccent}>{deck.contactEmail}</Text>
            </View>
          ) : null}
          {deck.contactWeb ? (
            <View style={[styles.contactRow, { marginBottom: 0 }]}>
              <Text style={styles.contactBullet}>•</Text>
              <Text style={styles.contactTextAccent}>{deck.contactWeb}</Text>
            </View>
          ) : null}
        </View>
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
