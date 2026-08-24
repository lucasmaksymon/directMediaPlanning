# Facturación, comisiones y pagos — MVP NextPlanning

Este documento fija **propuestas operativas** para el MVP y lista **decisiones obligatorias** con asesoría contable y legal (Argentina). No sustituye asesoramiento profesional.

---

## 1. Modelo de ingresos (recordatorio del business plan)

| Fuente | Descripción | MVP |
|--------|-------------|-----|
| Comisión por transacción | % sobre el valor de la reserva/campaña cerrada en plataforma | **Sí** (parametrizable) |
| SaaS premium | Suscripción por funciones avanzadas | Opcional post-MVP o bandera “coming soon” |
| Marketplace / destacados | Fee a medios por visibilidad | Fase posterior |
| Data / informes | Venta de insights | Fuera de alcance MVP |

---

## 2. Comisión — parámetros a definir

| Parámetro | Rango orientativo (business plan) | Decisión pendiente |
|-----------|-----------------------------------|--------------------|
| Porcentaje | 5–8 % (vs 15–20 % agencia) | % exacto por tipo de inventario |
| Pagador | Anunciante, medio o **split** | Definir y documentar en Términos |
| Mínimo por operación | Opcional (evita micro-transacciones costosas) | Sí / No y monto |
| IVA / tratamiento fiscal sobre comisión | Depende de entidad y régimen | Contador |

**Propuesta de trabajo para el MVP:** comisión **retenida en el momento del cobro** (si la plataforma procesa el pago) **o** facturada **por separado** a cada parte si el pago es directo entre anunciante y medio. La opción afecta la integración de pagos y el rol legal de la plataforma (intermediario vs. mero directorio).

---

## 3. Rol de la plataforma frente al pago (alternativas)

| Modelo | Descripción | Complejidad | Notas |
|--------|-------------|---------------|-------|
| **A. Marketplace con cobro** | La plataforma cobra al anunciante y liquida al medio (menos comisión) | Alta: requiere claridad contractual, posible retenciones, plazos de pago al medio | Común en marketplaces maduros |
| **B. Pasarela / enlace** | Pago procesado pero contrato principal entre anunciante y medio | Media | Depende de pasarela y términos |
| **C. Solo “match” + pago externo** | La plataforma no mueve fondos; cobra comisión por factura mensual o suscripción | Menor integración inmediata | Válido para beta muy temprana |

**Recomendación para reducir riesgo en beta:** comenzar con **(C)** o **(B) simplificado** mientras se define el modelo societario y fiscal, **o** avanzar a **(A)** si ya existe entidad y asesoramiento listo.

---

## 4. Facturación y comprobantes (Argentina)

Puntos típicos a resolver con contador:

- Régimen de la entidad que **factura la comisión** (IVA, monotributo, RI, etc.).
- Si el **medio** y el **anunciante** se facturan entre sí, quién emite qué comprobante y en qué momento.
- **Percepciones** y tratamiento de servicios digitales / marketplace.

El producto puede incluir en MVP:

- Campos de datos fiscales (CUIT, razón social, condición IVA) en perfiles.
- Exportación CSV de transacciones para facturación manual.
- **No** exigir en MVP integración completa con AFIP salvo decisión explícita de negocio.

---

## 5. Pasarela de pago — criterios de elección

| Criterio | Pregunta |
|----------|----------|
| Cobro con tarjeta (nacional/internacional) | ¿Necesario en la primera beta? |
| Split de pagos / marketplace | ¿Requerido desde el día 1? |
| Medios de pago locales | Transferencia, Mercado Pago, otros |
| Onboarding del merchant | ¿La plataforma es merchant único o cada medio conecta su cuenta? |

**Pasos sugeridos:** (1) Elegir modelo A/B/C arriba; (2) pedir propuesta a 1–2 PSPs compatibles con Argentina; (3) mapear flujo de liquidación al medio.

---

## 6. Tabla de decisión resumida

| ID | Decisión | Estado |
|----|----------|--------|
| D1 | Modelo de cobro: A, B o C | **C** (beta inicial — confirmado para implementación) |
| D2 | % comisión y pagador | Pendiente |
| D3 | Entidad jurídica que factura comisiones y tratamiento fiscal | Pendiente (contador) |
| D4 | Pasarela o “solo transferencia” en beta | Pendiente |
| D5 | Datos fiscales obligatorios antes de primera reserva | Recomendado sí para facturación B2B |

---

## 7. Referencias cruzadas

- Alcance y journey: [01-alcance-mvp.md](./01-alcance-mvp.md)
- PRD y reglas de negocio en producto: [04-prd-mvp.md](./04-prd-mvp.md)
