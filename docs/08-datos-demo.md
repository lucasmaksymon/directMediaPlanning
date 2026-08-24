# Seed limpio — bootstrap para producción

Cargados con [`prisma/seed.ts`](../prisma/seed.ts). El seed **borra toda la base** solo si `SEED_RESET=true`.

## Variables de entorno

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `SEED_ADMIN_EMAIL` | Sí | Email del único usuario admin |
| `SEED_ADMIN_PASSWORD` | Sí | Mínimo 8 caracteres |
| `SEED_RESET` | Sí (`true`) | Debe ser exactamente `true` para permitir el wipe |

## Comando

```bash
SEED_RESET=true \
SEED_ADMIN_EMAIL="admin@tudominio.com" \
SEED_ADMIN_PASSWORD="tu-password-seguro" \
npm run db:seed
```

En Render: migrar con `prisma migrate deploy` y correr el seed **una sola vez** desde el shell (con las env ya configuradas).

## Qué crea

| Entidad | Detalle |
|---------|---------|
| Admin | 1 usuario `role=admin` |
| Proveedores medios | ~30 `ProviderProfile` sin login (nombres del Drive Media Kits 2026) |
| Paquetes | Proveedor `NextMedia Paquetes` + 2 unidades `digital_package` en **draft** (precio placeholder, negociable) |

No crea anunciantes, agencias, medios con login, reservas ni inventario publicado. `/explorar` queda vacío hasta que operaciones publique unidades con tarifas reales.
