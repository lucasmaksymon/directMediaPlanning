# Datos de demostración (emails y contenido de prueba)

Los datos se cargan con el seed de Prisma ([`prisma/seed.ts`](../prisma/seed.ts)). **No son cuentas reales de correo:** el dominio `ejemplo.ar` sirve solo para login en la app; **no hay envío de emails** configurado en el MVP.

## Cómo cargar o refrescar

```bash
npm run db:seed
```

Cada ejecución **elimina y vuelve a crear** los usuarios cuyo email está en la lista fija del seed (mismas direcciones abajo). El resto de la base (otros usuarios que hayas creado a mano) **no** se borra.

---

## Contraseña común

Todos los usuarios demo comparten la misma contraseña:

| Campo | Valor |
|-------|--------|
| Contraseña | `Demostracion1` |

---

## Cuentas (emails y roles)

| Email | Rol | Perfil / notas |
|-------|-----|----------------|
| `demo.medio.caba@ejemplo.ar` | Proveedor (medio) | Empresa: **Wall Street Digital (demo)** |
| `demo.medio.subte@ejemplo.ar` | Proveedor (medio) | Empresa: **Vía Subte Media (demo)** |
| `demo.medio.interior@ejemplo.ar` | Proveedor (medio) | Empresa: **Metrópoli Interior (demo)** |
| `demo.anunciante@ejemplo.ar` | Anunciante | Razón social: **Marca Demo S.A.** |
| `demo.pyme@ejemplo.ar` | Anunciante | Razón social: **Pyme Local** |
| `demo.admin@ejemplo.ar` | Admin | Sin panel admin en el MVP; solo login de prueba |

---

## Inventario de prueba (8 unidades)

Precios en **ARS** (referencia). Estados: publicado / borrador / pausado.

### Wall Street Digital — `demo.medio.caba@ejemplo.ar`

| Nombre | Ubicación (resumen) | Precio ref. | Estado |
|--------|----------------------|-------------|--------|
| LED Obelisco — paseo lateral | CABA, San Nicolás (zona Obelisco) | 280.000 | Publicado |
| Pantalla Av. Corrientes y Florida | CABA, Microcentro | 195.000 | Publicado |
| Valla estática Av. del Libertador (demo) | CABA, Palermo | 120.000 | Borrador |

Coordenadas aprox.: Obelisco y Florida llevan lat/long en seed (mapa futuro).

### Vía Subte Media — `demo.medio.subte@ejemplo.ar`

| Nombre | Ubicación (resumen) | Precio ref. | Estado |
|--------|----------------------|-------------|--------|
| Digital Subte Línea B — estación Carlos Pellegrini | Subte Línea B, CABA | 95.000 | Publicado |
| Pack pasillos combinación Obelisco (demo) | Subte, múltiples pantallas | 420.000 | Publicado |
| Pantalla pausada (demo) | Subte Línea D | 70.000 | Pausado |

### Metrópoli Interior — `demo.medio.interior@ejemplo.ar`

| Nombre | Ubicación (resumen) | Precio ref. | Estado |
|--------|----------------------|-------------|--------|
| Digital vía Rosario — Av. Pellegrini | Rosario, Santa Fe | 88.000 | Publicado |
| Valla ruta 9 — Córdoba (demo) | Córdoba Capital | 65.000 | Publicado |

---

## Reservas de ejemplo (4)

Fechas en UTC en base; en pantalla verás fechas según tu zona.

| Unidad (resumen) | Anunciante | Estado | Rango de fechas (aprox.) |
|------------------|------------|--------|---------------------------|
| LED Obelisco | `demo.anunciante@ejemplo.ar` | Pendiente del medio | 1–15 may 2026 |
| Pantalla Corrientes y Florida | `demo.pyme@ejemplo.ar` | Aceptada | 1–15 may 2026 |
| Digital Subte Línea B — Pellegrini | `demo.anunciante@ejemplo.ar` | Confirmada | 1–20 jun 2026 |
| Digital Rosario — Pellegrini | `demo.pyme@ejemplo.ar` | Rechazada | 1–15 may 2026 |

La reserva **confirmada** incluye `platformFeeRate` de ejemplo **6,5 %** (0,065) a nivel dato; el cobro sigue siendo modelo C (fuera de app).

---

## Otros datos sembrados

- **Un bloque de disponibilidad** (`AvailabilityBlock`) en la unidad Obelisco, estado disponible, rango abr–dic 2026 (para evolución de calendario).

---

## Dónde verlo en la app

| Vista | Ruta | Cuenta sugerida |
|-------|------|-----------------|
| Explorar catálogo | `/explorar` | Cualquiera / sin login |
| Mis solicitudes | `/advertiser` | `demo.anunciante@ejemplo.ar` o `demo.pyme@ejemplo.ar` |
| Inventario | `/provider/inventory` | Cualquier `demo.medio.*@ejemplo.ar` |
| Solicitudes | `/provider/reservations` | Medio dueño de la unidad (p. ej. CABA para Obelisco/Florida) |

---

## Referencias

- Flujos: [07-flujos-mvp.md](./07-flujos-mvp.md)
- README (comando seed): [README](../README.md)
- Fuente de verdad en código: [`prisma/seed.ts`](../prisma/seed.ts)
