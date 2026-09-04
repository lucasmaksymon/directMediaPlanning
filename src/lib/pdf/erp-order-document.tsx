import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ERP_ISSUER } from "@/lib/erp";

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 10, color: "#111" },
  issuerRight: { textAlign: "right", fontSize: 8, color: "#333", lineHeight: 1.4 },
  issuerName: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right", marginBottom: 4 },
  rule: { marginTop: 12, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#111" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  date: { fontSize: 10 },
  line: { marginBottom: 6 },
  label: { fontFamily: "Helvetica-Bold" },
  box: { marginTop: 16, borderWidth: 1, borderColor: "#111", padding: 10 },
  totals: { marginTop: 8, fontSize: 11 },
  footer: { position: "absolute", bottom: 36, left: 28, right: 28, fontSize: 8, color: "#666" },
  sigs: { flexDirection: "row", justifyContent: "space-between", marginTop: 48 },
  sig: { width: "42%", borderTopWidth: 1, borderTopColor: "#111", paddingTop: 6, textAlign: "center", fontSize: 8 },
});

export type ErpOrderPdfKind = "venta" | "compra" | "produccion";

const TITLES: Record<ErpOrderPdfKind, string> = {
  venta: "ORDEN DE PUBLICIDAD",
  compra: "ORDEN DE COMPRA",
  produccion: "ORDEN DE PRODUCCION",
};

export function ErpOrderDocument(props: {
  kind: ErpOrderPdfKind;
  number: string;
  issuedAt: string;
  period: string;
  counterpartyLabel: string;
  counterparty: string;
  relatedLabel?: string;
  related?: string;
  taxId?: string | null;
  net: string;
  vat: string;
  amount: string;
  estado: string;
  settlement: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.issuerName}>{ERP_ISSUER.legalName}</Text>
        <Text style={styles.issuerRight}>{ERP_ISSUER.address}</Text>
        <Text style={styles.issuerRight}>{ERP_ISSUER.phone}</Text>
        <Text style={styles.issuerRight}>{ERP_ISSUER.email}</Text>
        <Text style={styles.issuerRight}>{ERP_ISSUER.tax}</Text>
        <View style={styles.rule} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {TITLES[props.kind]}: {props.number}
          </Text>
          <Text style={styles.date}>FECHA: {props.issuedAt}</Text>
        </View>

        <Text style={styles.line}>
          <Text style={styles.label}>{props.counterpartyLabel}: </Text>
          {props.counterparty}
        </Text>
        {props.taxId ? (
          <Text style={styles.line}>
            <Text style={styles.label}>CUIT: </Text>
            {props.taxId}
          </Text>
        ) : null}
        {props.related ? (
          <Text style={styles.line}>
            <Text style={styles.label}>{props.relatedLabel}: </Text>
            {props.related}
          </Text>
        ) : null}
        <Text style={styles.line}>
          <Text style={styles.label}>PERÍODO: </Text>
          {props.period}
        </Text>
        <Text style={styles.line}>
          <Text style={styles.label}>ESTADO: </Text>
          {props.estado}
        </Text>
        <Text style={styles.line}>
          <Text style={styles.label}>CONDICIÓN: </Text>
          {props.settlement}
        </Text>

        <View style={styles.box}>
          <Text style={styles.totals}>Neto: {props.net}</Text>
          <Text style={styles.totals}>IVA: {props.vat}</Text>
          <Text style={[styles.totals, { fontFamily: "Helvetica-Bold", marginTop: 6 }]}>
            IMPORTE: {props.amount}
          </Text>
        </View>

        <View style={styles.sigs}>
          <Text style={styles.sig}>Firma / Aclaración</Text>
          <Text style={styles.sig}>{ERP_ISSUER.legalName}</Text>
        </View>

        <Text style={styles.footer}>
          Documento generado por NextPlanning. Misma lógica de importes que ADMINISTRACION
          (importe = neto + IVA).
        </Text>
      </Page>
    </Document>
  );
}
