import React from "react";
import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ERP_ISSUER, money } from "@/lib/erp";
import { ERP_ORDER_LEGAL, formatMoneyOrDash, formatQty } from "@/lib/erp-order-docs";
import { BRAND_LOGO_COLOR_ASPECT } from "@/lib/presentations/brand-logo";
import { brandLogoColorDataUri } from "@/lib/presentations/brand-logo-server";

const LOGO_HEIGHT = 36;

const styles = StyleSheet.create({
  page: { padding: 22, fontFamily: "Helvetica", fontSize: 9, color: "#111" },
  landscape: { padding: 16, fontFamily: "Helvetica", fontSize: 8, color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { height: LOGO_HEIGHT, width: LOGO_HEIGHT * BRAND_LOGO_COLOR_ASPECT },
  issuerBlock: { maxWidth: "52%" },
  issuerRight: { textAlign: "right", fontSize: 7.5, color: "#333", lineHeight: 1.35 },
  issuerName: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right", marginBottom: 3 },
  rule: { marginTop: 8, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#111" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  date: { fontSize: 9 },
  meta: { marginBottom: 3 },
  label: { fontFamily: "Helvetica-Bold" },
  section: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 5 },
  tableHead: { flexDirection: "row", fontFamily: "Helvetica-Bold", borderBottomWidth: 0.8, borderBottomColor: "#111", paddingBottom: 3, marginBottom: 3 },
  row: { flexDirection: "row", paddingVertical: 2, borderBottomWidth: 0.3, borderBottomColor: "#ddd" },
  kv: { flexDirection: "row", marginBottom: 3 },
  k: { width: "32%", fontFamily: "Helvetica-Bold" },
  v: { width: "68%" },
  totals: { marginTop: 8, width: "46%", marginLeft: "auto" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  totalStrong: { fontFamily: "Helvetica-Bold", marginTop: 3, borderTopWidth: 0.8, borderTopColor: "#111", paddingTop: 3 },
  notes: { marginTop: 10, fontSize: 8, lineHeight: 1.35 },
  legal: { marginTop: 10, fontSize: 7.5, textAlign: "center", fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 16, left: 22, right: 22, fontSize: 6.5, color: "#555", textAlign: "center" },
  sigs: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  sig: { width: "42%", borderTopWidth: 1, borderTopColor: "#111", paddingTop: 5, textAlign: "center", fontSize: 8 },
  muted: { color: "#444", fontSize: 8 },
});

function IssuerHeader() {
  const logoSrc = brandLogoColorDataUri();
  return (
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
  );
}

function MetaLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Text style={styles.meta}>
      <Text style={styles.label}>{label}: </Text>
      {value}
    </Text>
  );
}

function Kv({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value}</Text>
    </View>
  );
}

export type SaleOrderPdfItem = {
  element: string;
  location?: string | null;
  plaza?: string | null;
  days?: number | null;
  faces?: number;
  quantity: number;
  measures?: string | null;
  unitCost: number;
  exhibitionNet: number;
  bonusNet: number;
  productionNet: number;
  period?: string | null;
};

export function ErpSaleOrderDocument(props: {
  number: string;
  issuedAt: string;
  client: string;
  taxId?: string | null;
  product?: string | null;
  plaza?: string | null;
  period: string;
  observations?: string | null;
  agencyFeePct: number;
  items: SaleOrderPdfItem[];
  exhibition: number;
  bonus: number;
  production: number;
  subExhibition: number;
  agency: number;
  hasLines: boolean;
  net: string;
  vat: string;
  amount: string;
}) {
  const subEP = props.subExhibition + props.production;
  return (
    <Document title={`ORDEN DE COMPRA ${props.number}`} author="NEXTMEDIA">
      <Page orientation="landscape" size="A4" style={styles.landscape}>
        <IssuerHeader />
        <View style={styles.rule} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>ORDEN DE COMPRA {props.number}</Text>
          <Text style={styles.date}>FECHA: {props.issuedAt}</Text>
        </View>
        <MetaLine label="CLIENTE" value={props.client} />
        <MetaLine label="CUIT" value={props.taxId} />
        <MetaLine label="PRODUCTO" value={props.product} />
        <MetaLine label="PLAZA" value={props.plaza} />
        <MetaLine label="PERÍODO" value={props.period} />
        <View style={styles.rule} />

        <View style={styles.tableHead}>
          <Text style={{ width: "12%" }}>ELEMENTO</Text>
          <Text style={{ width: "16%" }}>UBICACIÓN</Text>
          <Text style={{ width: "8%" }}>PLAZA</Text>
          <Text style={{ width: "6%" }}>DÍAS</Text>
          <Text style={{ width: "7%" }}>CARAS</Text>
          <Text style={{ width: "7%" }}>CANT.</Text>
          <Text style={{ width: "12%" }}>MEDIDAS</Text>
          <Text style={{ width: "10%", textAlign: "right" }}>UNITARIO</Text>
          <Text style={{ width: "11%", textAlign: "right" }}>EXHIBICIÓN</Text>
          <Text style={{ width: "11%", textAlign: "right" }}>PRODUCCIÓN</Text>
        </View>
        {props.items.length === 0 ? (
          <Text style={styles.muted}>Sin ítems de campaña.</Text>
        ) : (
          props.items.map((item, i) => (
            <View key={i} style={styles.row} wrap={false}>
              <Text style={{ width: "12%" }}>{item.element}</Text>
              <Text style={{ width: "16%" }}>{item.location || "—"}</Text>
              <Text style={{ width: "8%" }}>{item.plaza || "—"}</Text>
              <Text style={{ width: "6%" }}>{item.days ?? "—"}</Text>
              <Text style={{ width: "7%" }}>{formatQty(item.faces)}</Text>
              <Text style={{ width: "7%" }}>{formatQty(item.quantity)}</Text>
              <Text style={{ width: "12%" }}>{item.measures || "—"}</Text>
              <Text style={{ width: "10%", textAlign: "right" }}>{formatMoneyOrDash(item.unitCost)}</Text>
              <Text style={{ width: "11%", textAlign: "right" }}>{formatMoneyOrDash(item.exhibitionNet)}</Text>
              <Text style={{ width: "11%", textAlign: "right" }}>{formatMoneyOrDash(item.productionNet)}</Text>
            </View>
          ))
        )}

        <View style={styles.totals}>
          {props.hasLines ? (
            <>
              <View style={styles.totalRow}>
                <Text>TOTAL EXHIBICIÓN</Text>
                <Text>{money(props.exhibition)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>ELEMENTOS BONIFICADOS</Text>
                <Text>{money(props.bonus)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>SUBTOTAL EXHIBICIÓN</Text>
                <Text>{money(props.subExhibition)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>SUBTOTAL PRODUCCIÓN</Text>
                <Text>{money(props.production)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>SUBTOTAL EXHIBICIÓN, PRODUCCIÓN</Text>
                <Text>{money(subEP)}</Text>
              </View>
              {props.agencyFeePct > 0 ? (
                <View style={styles.totalRow}>
                  <Text>SERVICIO AGENCIA {props.agencyFeePct}%</Text>
                  <Text>{money(props.agency)}</Text>
                </View>
              ) : null}
            </>
          ) : null}
          <View style={styles.totalRow}>
            <Text>SUBTOTAL</Text>
            <Text>{props.net}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>IVA 21%</Text>
            <Text>{props.vat}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalStrong]}>
            <Text>TOTAL $ ARG</Text>
            <Text>{props.amount}</Text>
          </View>
        </View>

        <Text style={styles.section}>OBSERVACIONES</Text>
        <Text style={styles.notes}>{props.observations || defaultSaleObservationsFallback(props.client)}</Text>
        <Text style={styles.legal}>{ERP_ORDER_LEGAL.ventaApproval}</Text>
        <Text style={styles.footer}>{ERP_ORDER_LEGAL.footer}</Text>
      </Page>
    </Document>
  );
}

function defaultSaleObservationsFallback(client: string) {
  return `${ERP_ORDER_LEGAL.startSubjectToMaterial}\n${ERP_ORDER_LEGAL.cuentaYOrden(client)}`;
}

export type PurchaseOrderPdfItem = {
  element: string;
  location?: string | null;
  quantity: number;
  days?: number | null;
  measures?: string | null;
  unitCost: number;
  net: number;
};

export function ErpPurchaseOrderDocument(props: {
  number: string;
  issuedAt: string;
  vendor: string;
  taxId?: string | null;
  client: string;
  product?: string | null;
  media?: string | null;
  measures?: string | null;
  locations?: string | null;
  period?: string | null;
  paidQty: number;
  bonusQty: number;
  unitCost: number;
  printShop?: string | null;
  printSupport?: string | null;
  observations?: string | null;
  items: PurchaseOrderPdfItem[];
  net: string;
  vat: string;
  amount: string;
}) {
  const totalQty = props.paidQty + props.bonusQty;
  return (
    <Document title={`ORDEN DE PUBLICIDAD ${props.number}`} author="NEXTMEDIA">
      <Page size="A4" style={styles.page}>
        <IssuerHeader />
        <View style={styles.rule} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>ORDEN DE PUBLICIDAD</Text>
          <Text style={styles.date}>Nº {props.number}</Text>
        </View>
        <View style={styles.rule} />

        <Kv label="Fecha" value={props.issuedAt} />
        <Kv label="Razón social" value={props.vendor} />
        <Kv label="CUIT" value={props.taxId} />
        <Kv label="Cliente" value={props.client} />
        <Kv label="Producto" value={props.product} />

        <Text style={styles.section}>PAUTA PUBLICITARIA</Text>
        <Kv label="Medio" value={props.media} />
        <Kv label="Medidas" value={props.measures} />
        <Kv label="Ubicaciones" value={props.locations} />
        <Kv label="Período" value={props.period} />
        {props.paidQty > 0 ? <Kv label="Elementos pagos" value={formatQty(props.paidQty)} /> : null}
        {props.bonusQty > 0 ? <Kv label="Elementos bonificados" value={formatQty(props.bonusQty)} /> : null}
        {totalQty > 0 ? <Kv label="Elementos totales" value={formatQty(totalQty)} /> : null}
        {props.unitCost > 0 ? <Kv label="Costo neto unitario" value={money(props.unitCost)} /> : null}
        <Kv label="Costo neto total" value={`${props.net} + IVA`} />

        {props.items.length > 0 ? (
          <>
            <Text style={styles.section}>DESCRIPCIÓN DE LA COMPRA</Text>
            <View style={styles.tableHead}>
              <Text style={{ width: "18%" }}>ELEMENTO</Text>
              <Text style={{ width: "28%" }}>UBICACIÓN</Text>
              <Text style={{ width: "10%" }}>DÍAS</Text>
              <Text style={{ width: "10%" }}>CANT.</Text>
              <Text style={{ width: "16%", textAlign: "right" }}>UNITARIO</Text>
              <Text style={{ width: "18%", textAlign: "right" }}>NETO</Text>
            </View>
            {props.items.map((item, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={{ width: "18%" }}>{item.element}</Text>
                <Text style={{ width: "28%" }}>{item.location || "—"}</Text>
                <Text style={{ width: "10%" }}>{item.days ?? "—"}</Text>
                <Text style={{ width: "10%" }}>{formatQty(item.quantity)}</Text>
                <Text style={{ width: "16%", textAlign: "right" }}>{formatMoneyOrDash(item.unitCost)}</Text>
                <Text style={{ width: "18%", textAlign: "right" }}>{formatMoneyOrDash(item.net)}</Text>
              </View>
            ))}
          </>
        ) : null}

        {props.printShop || props.printSupport ? (
          <>
            <Text style={styles.section}>MATERIAL IMPRESO</Text>
            <Kv label="Imprenta" value={props.printShop} />
            <Kv label="Soporte" value={props.printSupport} />
          </>
        ) : null}

        <Text style={styles.section}>OBSERVACIONES</Text>
        <Text style={styles.notes}>{props.observations || ERP_ORDER_LEGAL.cuentaYOrden(props.client)}</Text>
        <Text style={[styles.notes, { marginTop: 8 }]}>{ERP_ORDER_LEGAL.photoCert}</Text>
        <Text style={styles.legal}>{ERP_ORDER_LEGAL.compraApproval} {props.number}</Text>
        <Text style={styles.footer}>{ERP_ORDER_LEGAL.footer}</Text>
      </Page>
    </Document>
  );
}

export type ProductionOrderPdfItem = {
  element: string;
  location?: string | null;
  quantity: number;
  measures?: string | null;
  printSupport?: string | null;
  net: number;
};

export function ErpProductionOrderDocument(props: {
  number: string;
  issuedAt: string;
  vendor: string;
  taxId?: string | null;
  client: string;
  product?: string | null;
  measures?: string | null;
  printSupport?: string | null;
  quantity: number;
  motifs?: string | null;
  unitCost: number;
  invoiceDetail?: string | null;
  pickup?: string | null;
  colorProof?: string | null;
  observations?: string | null;
  items: ProductionOrderPdfItem[];
  deliveries: { destination: string; quantity: number }[];
  net: string;
  vat: string;
  amount: string;
}) {
  return (
    <Document title={`ORDEN DE PRODUCCIÓN ${props.number}`} author="NEXTMEDIA">
      <Page size="A4" style={styles.page}>
        <IssuerHeader />
        <View style={styles.rule} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>ORDEN DE PRODUCCIÓN</Text>
          <Text style={styles.date}>Nº {props.number}</Text>
        </View>
        <View style={styles.rule} />

        <Kv label="Fecha" value={props.issuedAt} />
        <Kv label="Razón social" value={props.vendor} />
        <Kv label="CUIT" value={props.taxId} />
        <Kv label="Cliente" value={props.client} />
        <Kv label="Producto" value={props.product} />

        <Text style={styles.section}>DETALLE / DATOS TÉCNICOS</Text>
        <Kv label="Producto" value={props.product} />
        <Kv label="Medidas" value={props.measures} />
        <Kv label="Soporte impresión" value={props.printSupport} />
        {props.quantity > 0 ? <Kv label="Cantidad" value={formatQty(props.quantity)} /> : null}
        <Kv label="Motivos" value={props.motifs} />
        {props.unitCost > 0 ? <Kv label="Precio unitario" value={money(props.unitCost)} /> : null}
        <Kv label="Detalle FC" value={props.invoiceDetail} />
        <Kv label="Costo neto de producción" value={`${props.net} + IVA`} />
        <Kv label="Importe" value={props.amount} />

        {props.items.length > 0 ? (
          <>
            <View style={[styles.tableHead, { marginTop: 8 }]}>
              <Text style={{ width: "18%" }}>DISPOSITIVO</Text>
              <Text style={{ width: "10%" }}>CANT.</Text>
              <Text style={{ width: "18%" }}>MEDIDAS</Text>
              <Text style={{ width: "24%" }}>DIRECCIÓN</Text>
              <Text style={{ width: "16%" }}>SOPORTE</Text>
              <Text style={{ width: "14%", textAlign: "right" }}>COSTO</Text>
            </View>
            {props.items.map((item, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={{ width: "18%" }}>{item.element}</Text>
                <Text style={{ width: "10%" }}>{formatQty(item.quantity)}</Text>
                <Text style={{ width: "18%" }}>{item.measures || "—"}</Text>
                <Text style={{ width: "24%" }}>{item.location || "—"}</Text>
                <Text style={{ width: "16%" }}>{item.printSupport || "—"}</Text>
                <Text style={{ width: "14%", textAlign: "right" }}>{formatMoneyOrDash(item.net)}</Text>
              </View>
            ))}
          </>
        ) : null}

        {props.deliveries.length > 0 ? (
          <>
            <Text style={styles.section}>RETIRO MATERIAL IMPRESO</Text>
            {props.deliveries.map((d, i) => (
              <View key={i} style={styles.kv}>
                <Text style={styles.k}>{d.destination}</Text>
                <Text style={styles.v}>{formatQty(d.quantity)}</Text>
              </View>
            ))}
          </>
        ) : props.pickup ? (
          <Kv label="Retiro material" value={props.pickup} />
        ) : null}

        <Text style={styles.section}>OBSERVACIONES</Text>
        <Text style={styles.notes}>
          {props.observations || `${ERP_ORDER_LEGAL.artes}\n${props.colorProof || ERP_ORDER_LEGAL.colorProof}`}
        </Text>
        {props.colorProof && props.observations ? <Kv label="Prueba color" value={props.colorProof} /> : null}

        <View style={styles.sigs}>
          <Text style={styles.sig}>Firma / Aclaración</Text>
          <Text style={styles.sig}>Recibida / Fecha</Text>
        </View>
        <Text style={styles.legal}>{ERP_ORDER_LEGAL.produccionApproval} {props.number}</Text>
        <Text style={styles.footer}>{ERP_ORDER_LEGAL.footer}</Text>
      </Page>
    </Document>
  );
}

/** @deprecated kept for any leftover import; prefer the typed documents. */
export type ErpOrderPdfKind = "venta" | "compra" | "produccion";
