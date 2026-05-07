# Backlog priorizado — MVP Direct Planning

Convención: **P0** = bloquea beta cerrada; **P1** = importante para buena experiencia; **P2** = siguiente iteración. Las historias están ordenadas por prioridad sugerida dentro de cada nivel.

---

## P0 — Fundaciones

| ID | Historia | Criterios de aceptación (resumen) |
|----|----------|-----------------------------------|
| P0-1 | Como sistema, quiero persistir usuarios con roles `advertiser`, `provider`, `admin` | Registro, login, recuperación básica de sesión; rol asignado y verificado en API |
| P0-2 | Como medio, quiero crear y publicar una unidad de inventario OOH | Formulario según modelo en [03-modelo-inventario-ooh.md](./03-modelo-inventario-ooh.md); estado publicado visible en listados internos |
| P0-3 | Como medio, quiero definir disponibilidad por rangos de fechas | Sin solapes de reservas confirmadas; validación en servidor |
| P0-4 | Como anunciante, quiero buscar unidades por ubicación y filtros básicos | Filtros mínimos: texto ubicación, fechas, rango precio; resultados coherentes |
| P0-5 | Como anunciante, quiero solicitar una reserva en fechas disponibles | Crea solicitud `pending_provider`; bloquea conflicto con otras confirmadas |
| P0-6 | Como medio, quiero aceptar o rechazar solicitudes | Estados actualizados; anunciante notificado por email |
| P0-7 | Como admin, quiero ver listado de reservas y usuarios | Vista mínima para soporte |
| P0-8 | Como sistema, quiero enviar emails transaccionales básicos | Registro, nueva solicitud, decisión del medio |

---

## P1 — Cierre operativo y pagos

| ID | Historia | Criterios de aceptación (resumen) |
|----|----------|-----------------------------------|
| P1-1 | Como anunciante, quiero ver el detalle de mi solicitud y su estado | Timeline o estados claros |
| P1-2 | Como medio, quiero ver todas las solicitudes entrantes | Lista filtrable por estado |
| P1-3 | Como plataforma, quiero registrar monto y comisión esperada por reserva | Campos alineados a decisión de negocio; exportable |
| P1-4 | Como admin, quiero marcar “pago confirmado” manualmente o vía integración | Estado `confirmed` solo con regla definida |
| P1-5 | Como medio/anunciante, quiero completar datos fiscales en perfil | Campos CUIT, razón social, condición IVA |
| P1-6 | Como medio, quiero importar unidades desde CSV (plantilla fija) | Validación de columnas y errores por fila |

---

## P2 — Mejora de producto y escala

| ID | Historia | Criterios de aceptación (resumen) |
|----|----------|-----------------------------------|
| P2-1 | Como anunciante, quiero ver unidades en mapa | Mapa con pins si hay coordenadas |
| P2-2 | Como admin, quiero parametrizar % de comisión global | Sin redeploy |
| P2-3 | Como anunciante, quiero catálogo “digital package” | Tipo de unidad distinto; CTA consultar o precio desde |
| P2-4 | Como sistema, quiero retención corta (hold) de slot en checkout | Expira en N minutos; libera disponibilidad |
| P2-5 | Como producto, quiero eventos analíticos (page view, funnel reserva) | Herramienta tipo Plausible/PostHog/GTM según stack |

---

## Orden de implementación sugerido (sprints conceptuales)

1. **Sprint A:** P0-1, P0-2, P0-3  
2. **Sprint B:** P0-4, P0-5  
3. **Sprint C:** P0-6, P0-7, P0-8  
4. **Sprint D:** P1-1 — P1-4  
5. **Sprint E:** P1-5, P1-6, ítems P2 según capacidad  

---

## Trazabilidad con documentos

| Documento | Uso en backlog |
|-----------|----------------|
| [01-alcance-mvp.md](./01-alcance-mvp.md) | Alcance y fuera de alcance |
| [03-modelo-inventario-ooh.md](./03-modelo-inventario-ooh.md) | P0-2, P0-3, P1-6 |
| [02-facturacion-pagos-comisiones.md](./02-facturacion-pagos-comisiones.md) | P1-3, P1-4 |
| [04-prd-mvp.md](./04-prd-mvp.md) | Visión general funcional |
