import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InformeRow } from "@/lib/erp-informe";
import { ERP_MONTHS, money } from "@/lib/erp";

const styles = StyleSheet.create({
  page: { padding: 20, fontFamily: "Helvetica", fontSize: 8, color: "#111" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sub: { fontSize: 9, color: "#555", marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  head: { fontFamily: "Helvetica-Bold", borderBottomWidth: 1, borderBottomColor: "#111" },
  strong: { fontFamily: "Helvetica-Bold" },
  red: { color: "#b42318" },
  c0: { width: "18%" },
  c1: { width: "12%" },
  c2: { width: "12%", textAlign: "right" },
  c3: { width: "12%", textAlign: "right" },
  c4: { width: "12%", textAlign: "right" },
  c5: { width: "12%", textAlign: "right" },
  c6: { width: "12%", textAlign: "right" },
  c7: { width: "10%", textAlign: "right" },
});

export function ErpInformeDocument(props: { month: number; year: number; rows: InformeRow[] }) {
  return (
    <Document>
      <Page orientation="landscape" size="A4" style={styles.page}>
        <Text style={styles.title}>Informe mensual</Text>
        <Text style={styles.sub}>
          {ERP_MONTHS[props.month]} {props.year} · ganancia = venta − compra − compra IVA
        </Text>
        <View style={[styles.row, styles.head]}>
          <Text style={styles.c0}>Cliente</Text>
          <Text style={styles.c1}>Orden</Text>
          <Text style={styles.c2}>Compra</Text>
          <Text style={styles.c3}>Venta</Text>
          <Text style={styles.c4}>Compra IVA</Text>
          <Text style={styles.c5}>Comisión</Text>
          <Text style={styles.c6}>Ganancia</Text>
          <Text style={styles.c7}>%</Text>
        </View>
        {props.rows.map((r, i) => (
          <View key={`${r.kind}-${i}`} style={styles.row}>
            <Text style={[styles.c0, r.kind !== "order" ? styles.strong : {}]}>{r.client}</Text>
            <Text style={[styles.c1, r.uninvoiced ? styles.red : {}]}>{r.order}</Text>
            <Text style={styles.c2}>{money(r.compraTotal)}</Text>
            <Text style={styles.c3}>{r.kind === "expenses" ? "—" : money(r.ventaTotal)}</Text>
            <Text style={styles.c4}>{r.kind === "expenses" ? "—" : money(r.totalCompraIva)}</Text>
            <Text style={styles.c5}>{r.kind === "expenses" ? "—" : money(r.comision)}</Text>
            <Text style={[styles.c6, styles.strong]}>{money(r.gananciaBruta)}</Text>
            <Text style={styles.c7}>{r.porcentaje == null ? "—" : `${r.porcentaje.toFixed(2)}%`}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
