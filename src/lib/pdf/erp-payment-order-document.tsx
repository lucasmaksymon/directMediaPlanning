import React from "react";
import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { amountToPesosText } from "@/lib/erp-number-text";
import { ERP_ISSUER } from "@/lib/erp";
import { BRAND_LOGO_COLOR_ASPECT } from "@/lib/presentations/brand-logo";
import { brandLogoColorDataUri } from "@/lib/presentations/brand-logo-server";

const LOGO_HEIGHT = 44;

const styles = StyleSheet.create({
  page: { padding: 20, fontFamily: "Helvetica", fontSize: 10, color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { height: LOGO_HEIGHT, width: LOGO_HEIGHT * BRAND_LOGO_COLOR_ASPECT },
  issuerBlock: { maxWidth: "48%" },
  issuerRight: { textAlign: "right", fontSize: 8, color: "#333", lineHeight: 1.4 },
  issuerName: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right", marginBottom: 4 },
  rule: { marginTop: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#111" },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 10 },
  tableHead: { flexDirection: "row", marginBottom: 6, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", marginBottom: 4 },
  c1: { width: "34%" },
  c2: { width: "33%" },
  c3: { width: "33%", textAlign: "right" },
  totalRow: { flexDirection: "row", marginTop: 4, fontFamily: "Helvetica-Bold" },
  totalSpacer: { width: "34%" },
  totalLabel: { width: "33%" },
  totalValue: { width: "33%", textAlign: "right" },
  currencyNote: { width: "34%", fontSize: 8, fontFamily: "Helvetica" },
  words: { fontSize: 8, marginTop: 8 },
});

export type PaymentOrderPdfLine = {
  label: string;
  date: string;
  amount: string;
};

export function ErpPaymentOrderDocument(props: {
  number: string;
  vendor: string;
  issuedAt: string;
  imputations: PaymentOrderPdfLine[];
  imputationTotal: string;
  payments: PaymentOrderPdfLine[];
  paymentTotal: string;
  paymentTotalRaw: number;
}) {
  const logoSrc = brandLogoColorDataUri();

  return (
    <Document title={`ORDEN DE PAGO Nº ${props.number}`} author="NEXTMEDIA">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
          <Image src={logoSrc} style={styles.logo} />
          <View style={styles.issuerBlock}>
            <Text style={styles.issuerName}>{ERP_ISSUER.legalName}</Text>
            <Text style={styles.issuerRight}>{ERP_ISSUER.address}</Text>
            <Text style={styles.issuerRight}>{ERP_ISSUER.phone}</Text>
            <Text style={styles.issuerRight}>{ERP_ISSUER.email}</Text>
            <Text style={styles.issuerRight}>{ERP_ISSUER.tax}</Text>
          </View>
        </View>
        <View style={styles.rule} />

        <Text style={styles.title}>ORDEN DE PAGO Nº {props.number}</Text>
        <View style={styles.rule} />

        <View style={styles.metaRow}>
          <Text>Proveedor: {props.vendor}</Text>
          <Text>Fecha: {props.issuedAt}</Text>
        </View>
        <View style={styles.rule} />

        <Text style={styles.sectionTitle}>IMPUTACIÓN</Text>
        <View style={styles.tableHead}>
          <Text style={styles.c1}>Nº COMPROBANTE</Text>
          <Text style={styles.c2}>FECHA</Text>
          <Text style={styles.c3}>IMPORTE</Text>
        </View>
        {props.imputations.map((line, i) => (
          <View key={`imp-${i}`} style={styles.row}>
            <Text style={styles.c1}>{line.label}</Text>
            <Text style={styles.c2}>{line.date}</Text>
            <Text style={styles.c3}>{line.amount}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalSpacer} />
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{props.imputationTotal}</Text>
        </View>
        <View style={styles.rule} />

        <View style={styles.tableHead}>
          <Text style={styles.c1}>MEDIO DE PAGO</Text>
          <Text style={styles.c2}>FECHA</Text>
          <Text style={styles.c3}>IMPORTE</Text>
        </View>
        {props.payments.map((line, i) => (
          <View key={`pay-${i}`} style={styles.row}>
            <Text style={styles.c1}>{line.label}</Text>
            <Text style={styles.c2}>{line.date}</Text>
            <Text style={styles.c3}>{line.amount}</Text>
          </View>
        ))}
        <View style={styles.rule} />
        <View style={styles.totalRow}>
          <Text style={styles.currencyNote}>EMITIDA EN MONEDA CORRIENTE</Text>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{props.paymentTotal}</Text>
        </View>
        <View style={styles.rule} />

        <Text style={styles.words}>{amountToPesosText(props.paymentTotalRaw)}</Text>
      </Page>
    </Document>
  );
}
