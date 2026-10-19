import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InformeExpenses, InformeRow } from "@/lib/erp-informe";
import { ERP_MONTHS, money } from "@/lib/erp";

const styles = StyleSheet.create({
  page: { padding: 20, fontFamily: "Helvetica", fontSize: 8, color: "#111" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sub: { fontSize: 9, color: "#555", marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  head: { fontFamily: "Helvetica-Bold", borderBottomWidth: 1, borderBottomColor: "#111" },
  strong: { fontFamily: "Helvetica-Bold" },
  red: { color: "#b42318" },
  section: { marginTop: 16, fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  c0: { width: "16%" },
  c1: { width: "10%" },
  c2: { width: "12%", textAlign: "right" },
  c3: { width: "12%", textAlign: "right" },
  c4: { width: "12%", textAlign: "right" },
  c5: { width: "12%", textAlign: "right" },
  c6: { width: "14%", textAlign: "right" },
  c7: { width: "12%", textAlign: "right" },
  expense: { width: "14%", paddingRight: 8 },
});

export function ErpInformeDocument(props: {
  month: number;
  year: number;
  rows: InformeRow[];
  expenses: InformeExpenses;
}) {
  const expenseLines = [
    ["Fijos", props.expenses.fixed],
    ["Banco", props.expenses.bank],
    ["IVA", props.expenses.vat],
    ["Compra IVA", props.expenses.vatPurchase],
    ["Gastos extra Ana", props.expenses.extra],
    ["Total gastos", props.expenses.total],
    ["Resultado", props.expenses.resultado],
  ] as const;

  return (
    <Document>
      <Page orientation="landscape" size="A4" style={styles.page}>
        <Text style={styles.title}>Informe mensual</Text>
        <Text style={styles.sub}>
          {ERP_MONTHS[props.month]} {props.year} · ganancia neta = venta − retenciones − compra − percepciones
        </Text>
        <View style={[styles.row, styles.head]}>
          <Text style={styles.c0}>Cliente</Text>
          <Text style={styles.c1}>Orden</Text>
          <Text style={styles.c2}>Compra</Text>
          <Text style={styles.c3}>Retenciones</Text>
          <Text style={styles.c4}>Venta</Text>
          <Text style={styles.c5}>Percepciones</Text>
          <Text style={styles.c6}>Ganancia neta</Text>
          <Text style={styles.c7}>%</Text>
        </View>
        {props.rows.map((r, i) => (
          <View key={`${r.kind}-${i}`} style={styles.row}>
            <Text style={[styles.c0, r.kind !== "order" ? styles.strong : {}]}>{r.client}</Text>
            <Text style={[styles.c1, r.uninvoiced ? styles.red : {}]}>{r.order}</Text>
            <Text style={styles.c2}>{money(r.compra)}</Text>
            <Text style={styles.c3}>{money(r.retenciones)}</Text>
            <Text style={styles.c4}>{money(r.venta)}</Text>
            <Text style={styles.c5}>{money(r.percepciones)}</Text>
            <Text style={[styles.c6, styles.strong]}>{money(r.gananciaNeta)}</Text>
            <Text style={styles.c7}>{r.porcentaje == null ? "—" : `${r.porcentaje.toFixed(2)}%`}</Text>
          </View>
        ))}
        <Text style={styles.section}>Gastos del mes</Text>
        <View style={styles.row}>
          {expenseLines.map(([label, value]) => (
            <View key={label} style={styles.expense}>
              <Text>{label}</Text>
              <Text style={styles.strong}>{money(value)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
