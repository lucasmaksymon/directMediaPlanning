import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, borderBottomWidth: 2, borderBottomColor: "#111", paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: "bold" },
  subtitle: { fontSize: 9, color: "#666", marginTop: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingVertical: 8 },
  cell: { flex: 1 },
  cellRight: { flex: 1, textAlign: "right" },
  total: { marginTop: 16, fontSize: 12, fontWeight: "bold", textAlign: "right" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#888" },
});

export type MediaPlanRow = {
  unitName: string;
  location: string;
  dates: string;
  amount: string;
};

export function MediaPlanDocument(props: {
  productName: string;
  advertiserName: string;
  generatedAt: string;
  rows: MediaPlanRow[];
  total: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{props.productName}</Text>
            <Text style={styles.subtitle}>Media Plan</Text>
          </View>
          <View>
            <Text>{props.advertiserName}</Text>
            <Text style={styles.subtitle}>{props.generatedAt}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={[styles.cell, { fontWeight: "bold" }]}>Espacio</Text>
          <Text style={[styles.cell, { fontWeight: "bold" }]}>Ubicación</Text>
          <Text style={[styles.cell, { fontWeight: "bold" }]}>Fechas</Text>
          <Text style={[styles.cellRight, { fontWeight: "bold" }]}>Inversión</Text>
        </View>

        {props.rows.map((r, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.cell}>{r.unitName}</Text>
            <Text style={styles.cell}>{r.location}</Text>
            <Text style={styles.cell}>{r.dates}</Text>
            <Text style={styles.cellRight}>{r.amount}</Text>
          </View>
        ))}

        <Text style={styles.total}>Total: {props.total}</Text>

        <Text style={styles.footer}>
          Documento generado automáticamente. Precios en ARS. Sujeto a confirmación del medio.
        </Text>
      </Page>
    </Document>
  );
}
