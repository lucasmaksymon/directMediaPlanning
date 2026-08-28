export const ERP_HUB_MODULES = [
  {
    title: "Operación diaria",
    description: "La hoja GESTIÓN del Excel: campañas, cobros y pagos en un solo lugar.",
    items: [
      { href: "/backoffice/gestion", label: "Gestión", desc: "Órdenes, ítems, compra, venta y estados" },
      { href: "/backoffice/facturacion/pendientes", label: "Pagos pendientes", desc: "Vencimientos a proveedores" },
    ],
  },
  {
    title: "Órdenes",
    description: "O.P. de venta al cliente, compra al medio y producción.",
    items: [
      { href: "/backoffice/ordenes/venta", label: "O.P. Venta", desc: "Orden al anunciante" },
      { href: "/backoffice/ordenes/compra", label: "O.P. Compra", desc: "Orden al medio" },
      { href: "/backoffice/ordenes/produccion", label: "O. Producción", desc: "Orden al productor" },
    ],
  },
  {
    title: "Facturación",
    description: "Comprobantes, cobranzas y tesorería. Cierra la orden al completar el importe.",
    items: [
      { href: "/backoffice/facturacion/venta", label: "Facturas de venta", desc: "Tipo, punto y número" },
      { href: "/backoffice/facturacion/compra", label: "Facturas de compra", desc: "Con retenciones" },
      { href: "/backoffice/facturacion/iva", label: "Compra IVA", desc: "Factura IVA + comisión" },
      { href: "/backoffice/facturacion/recibos", label: "Recibos de venta", desc: "Cobra facturas" },
      { href: "/backoffice/facturacion/pagos", label: "Órdenes de pago", desc: "Paga al proveedor" },
      { href: "/backoffice/facturacion/cheques", label: "Cheques", desc: "Recibidos y emitidos" },
    ],
  },
  {
    title: "Maestros",
    description: "Clientes, proveedores, gastos e informe de resultado.",
    items: [
      { href: "/backoffice/clientes", label: "Clientes", desc: "CUIT, empresa, ejecutivo" },
      { href: "/backoffice/proveedores", label: "Proveedores", desc: "Medios y productores" },
      { href: "/backoffice/gastos", label: "Gastos", desc: "Fijos del mes" },
      { href: "/backoffice/informe", label: "Informe mensual", desc: "Compra, venta y ganancia" },
    ],
  },
  {
    title: "Configuración",
    description: "Catálogos que alimentan clientes y órdenes.",
    items: [
      { href: "/backoffice/config/empresas", label: "Empresas", desc: "Holding y plazo de pago" },
      { href: "/backoffice/config/plazas", label: "Plazas", desc: "Provincias y localidades" },
      { href: "/backoffice/config/elementos", label: "Elementos", desc: "CPM, MUPIS, LED…" },
      { href: "/backoffice/config/monedas", label: "Monedas", desc: "Cotización" },
    ],
  },
] as const;
