# PRD liviano — MVP NextPlanning

**Versión:** 0.1  
**Estado:** borrador de trabajo — alineado a [01-alcance-mvp.md](./01-alcance-mvp.md), [02-facturacion-pagos-comisiones.md](./02-facturacion-pagos-comisiones.md), [03-modelo-inventario-ooh.md](./03-modelo-inventario-ooh.md).

---

## 1. Resumen

Plataforma web que conecta **anunciantes** con **medios** para descubrir y reservar inventario **OOH digital** (prioritario) y **paquetes digitales** en catálogo, con búsqueda por ubicación, fechas y precio, registro de ambos lados, flujo de **solicitud → aceptación/rechazo → pago o verificación**, y panel **admin** mínimo.

---

## 2. Objetivos del MVP

| Objetivo | Métrica |
|----------|---------|
| Validar que medios publican inventario usable | N medios con ≥1 unidad activa |
| Validar que anunciantes completan solicitudes | N solicitudes / mes |
| Cerrar operaciones trazables | % solicitudes con estado terminal (confirmada/cancelada) |
| Base para iterar pagos y comisiones | Transacciones registradas con monto y comisión esperada |

---

## 3. Personas

1. **Ana — Anunciante (PME o marketer)**  
   Necesita ver opciones claras, precios, ubicación y poder reservar sin fricción excesiva.

2. **Martín — Responsable comercial del medio**  
   Necesita cargar pantallas/vallas, marcar disponibilidad y aprobar solicitudes rápido.

3. **Soporte / Admin plataforma**  
   Necesita ver usuarios, reservas y poder intervenir en disputas básicas.

---

## 4. Alcance funcional

### 4.1 Autenticación y perfiles

- Registro e inicio de sesión (email + contraseña o proveedor OAuth — decisión técnica).
- Roles: `advertiser`, `provider`, `admin`.
- Perfil anunciante: datos de empresa, contacto, datos fiscales básicos (para facturación futura).
- Perfil medio: razón social, CUIT, contacto, descripción.

### 4.2 Inventario (medio)

- CRUD de **unidades de inventario** según [03-modelo-inventario-ooh.md](./03-modelo-inventario-ooh.md).
- Asignación de **disponibilidad** por rangos (semana/día según decisión).
- Imágenes opcionales (almacenamiento en bucket).
- Estados: borrador / publicado / pausado.

### 4.3 Búsqueda y descubrimiento (anunciante)

- Filtros: ubicación (texto o mapa futuro), rango de fechas, rango de precio, tipo `digital_ooh` / `digital_package`.
- Listado ordenado por relevancia simple (precio, distancia si hay geo).
- Ficha de unidad con detalle, fotos, precio, CTA “Solicitar reserva”.

### 4.4 Reservas

- El anunciante elige fechas válidas según disponibilidad.
- Creación de solicitud en estado `pending_provider`.
- Notificación al medio (email mínimo en MVP).
- Medio: aceptar / rechazar con comentario opcional.
- Si aceptada: transición a flujo de pago según [02-facturacion-pagos-comisiones.md](./02-facturacion-pagos-comisiones.md).

### 4.5 Pagos (nivel PRD)

- **Mínimo:** registrar monto acordado, estado `payment_pending` → `confirmed` tras confirmación manual por admin **o** webhook de pasarela.
- **Deseable:** integración con una pasarela unificada cuando D1–D4 estén resueltos.

### 4.6 Admin

- Listado de usuarios y reservas.
- Cambio de estado manual ante fallos de integración.
- Parámetro global de **% comisión** (solo lectura en UI para no admin).

### 4.7 Notificaciones

- Email: registro, nueva solicitud, cambio de estado de reserva (plantillas mínimas).

### 4.8 Legal producto

- Páginas: Términos y Condiciones, Política de privacidad (contenido legal externo al equipo de desarrollo).

---

## 5. No objetivos (MVP)

- Integración con Meta/Google Ads.
- Programática OOH en tiempo real.
- Informes de desempeño unificados multicanal.
- App móvil nativa.
- IA de recomendación más allá de filtros.

---

## 6. Requisitos no funcionales

| Área | Objetivo |
|------|----------|
| Seguridad | Contraseñas hasheadas, HTTPS, roles en API, validación servidor |
| Auditoría | Log de cambios de estado en reservas |
| Rendimiento | Búsqueda usable con miles de unidades (índices BD) |
| Idioma | UI en español (AR) |

---

## 7. Dependencias de negocio

- Definición final de modelo de cobro (A/B/C) y pasarela.
- Textos legales y política de cancelación.
- Lista inicial de medios para beta (puede ser subconjunto del listado CABA-GBA).

---

## 8. Referencia de arquitectura

Ver [06-arquitectura-alto-nivel.md](./06-arquitectura-alto-nivel.md).
