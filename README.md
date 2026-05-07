# Direct Media Planning

Marketplace de medios publicitarios (MVP). Documentación de producto en [`docs/`](./docs/README.md).

## Stack acordado

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **PostgreSQL** en **Neon** vía Prisma

## Modelo de cobro (beta inicial)

**Modelo C:** la plataforma prioriza el **match** (búsqueda y reservas con estados); **pago y comisión** se gestionan fuera de la pasarela o con registro manual, según [`docs/02-facturacion-pagos-comisiones.md`](./docs/02-facturacion-pagos-comisiones.md).

## Requisitos

- Node.js 20+
- Cuenta [Neon](https://neon.tech) (o cualquier Postgres con cadena `DATABASE_URL` compatible)

## Puesta en marcha

```bash
cp .env.example .env
# Editar .env: DATABASE_URL de Neon, AUTH_SECRET (ver abajo), AUTH_URL=http://localhost:3000

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) y [http://localhost:3000/api/health](http://localhost:3000/api/health) (comprueba conexión a la base).

**AUTH_SECRET:** en desarrollo podés usar `openssl rand -base64 32` y pegar el valor en `.env`.

### Datos de demostración

Tras las migraciones, cargá el seed:

```bash
npm run db:seed
```

**Contraseña común:** `Demostracion1` — **Listado completo de emails, unidades, precios y reservas de ejemplo:** [`docs/08-datos-demo.md`](./docs/08-datos-demo.md).

Volver a ejecutar el seed **borra y recrea** solo las cuentas demo (mismos emails; ver documento).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:migrate` | Migraciones Prisma |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Carga datos demo (ver arriba) |
