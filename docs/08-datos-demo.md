# Seed limpio — bootstrap para producción

Cargados con [`prisma/seed.ts`](../prisma/seed.ts). El seed **borra toda la base** solo si `SEED_RESET=true`.

## Variables de entorno

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `SEED_ADMIN_EMAIL` | Sí | Email del único usuario admin |
| `SEED_ADMIN_PASSWORD` | Sí | Mínimo 8 caracteres |
| `SEED_RESET` | Sí (`true`) | Debe ser exactamente `true` para permitir el wipe |

## Inventario desde Drive

```bash
npm run import:drive   # genera prisma/data/drive-inventory.json + public/inventory/**
SEED_RESET=true SEED_ADMIN_EMAIL="..." SEED_ADMIN_PASSWORD="..." npm run db:seed
```

En Render: deployar con el JSON (y fotos si van en el repo) y correr el seed **una vez** en el shell. Luego `SEED_RESET=false`.

## Qué crea

| Entidad | Detalle |
|---------|---------|
| Admin | 1 usuario `role=admin` |
| Proveedores | ~30 del Drive Media Kits 2026 |
| Unidades | ~1000+ desde slides de Lotes / PPT UNIFICADO (dirección, tarifa, foto) |
