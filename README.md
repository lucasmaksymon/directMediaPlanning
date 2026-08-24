# NextPlanning

Plataforma de planificación y reserva de medios OOH (Out-of-Home) operada por **NextMedia**. Conecta tres actores: **Medios** (proveedores de espacios), **Anunciantes** y **Agencias**, con precios diferenciales, IA integrada y gestión end-to-end.

Documentación de producto en [`docs/`](./docs/README.md).

---

## Stack

- **Next.js 15** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS 4**
- **PostgreSQL** + **Prisma** (migraciones, seed)
- **NextAuth v5** — autenticación JWT con Credentials
- **OpenAI** — AI Planner, validación de creativos, yield insights
- **Resend** — emails transaccionales
- **Twilio** — notificaciones WhatsApp
- **UploadThing** — subida de imágenes

---

## Roles y portales

| Rol | Portal | Descripción |
|-----|--------|-------------|
| **Medio (provider)** | `/provider` | Carga espacios, gestiona disponibilidad, aprueba/rechaza reservas, ve analytics |
| **Anunciante (advertiser)** | `/advertiser` | Explora catálogo, usa el AI Planner, reserva espacios, valida creativos |
| **Agencia (agency)** | `/agency` | Gestiona anunciantes clientes, accede a precios preferenciales, cobra comisión |
| **Admin** | `/admin` | Backoffice completo: inventario global, reservas, usuarios, operaciones |

### Modelo de precios diferenciales

```
Precio directo   → Anunciante → Medio           (precio de lista)
Precio agencia   → Anunciante → Agencia → Medio (precio menor al directo)
Comisión         = precio directo − precio agencia  → ingreso de la agencia
```

El anunciante accede a precio preferencial vinculándose a una agencia. La agencia gestiona la comisión dentro de la plataforma.

---

## Funcionalidades principales

### Para el Medio
- Portal propio con dashboard de ocupación e ingresos
- CRUD de espacios: precio directo, precio agencia, instant book, last minute
- Gestión de solicitudes (aprobar/rechazar con nota al anunciante)
- Analytics: fill rate, ingresos por espacio, distribución de reservas
- Notificaciones por email al recibir nuevas solicitudes

### Para el Anunciante
- Catálogo con mapa, filtros, circuitos y last minute
- Precio diferencial según si está vinculado a una agencia
- AI Planner: genera plan de medios optimizado por presupuesto, zona y audiencia
- Barra de progreso de presupuesto al seleccionar espacios
- Validación de creativos con IA
- Media Plan PDF descargable
- Notificaciones por email/WhatsApp al confirmar una reserva

### Para la Agencia
- Panel con KPIs de clientes, inversión gestionada y comisiones totales
- Gestión de anunciantes clientes (vincular/desvincular por email)
- Comparador de espacios: precio directo vs. precio agencia y comisión estimada
- Comisión estándar configurable (default 15%)

---

## Requisitos

- Node.js 20+
- [Docker](https://www.docker.com/) (para PostgreSQL local)

---

## Puesta en marcha

### 1. Base de datos (PostgreSQL en Docker)

```bash
docker compose up -d
```

Si recreás el volumen desde cero:

```bash
docker compose down -v && docker compose up -d
```

### 2. Variables de entorno

```bash
cp .env.example .env
```

Variables mínimas en `.env`:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Apunta al Postgres del `docker-compose.yml` por defecto |
| `AUTH_SECRET` | Generar con `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` en desarrollo |
| `OPENAI_API_KEY` | Para AI Planner, validación creativa y yield insights |
| `RESEND_API_KEY` | Para emails transaccionales (opcional en dev) |
| `TWILIO_*` | Para notificaciones WhatsApp (opcional en dev) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Admin del bootstrap (`db:seed`) |
| `SEED_RESET` | Debe ser `true` para permitir wipe + seed |

### 3. Instalación y arranque

```bash
npm install
npx prisma generate
npx prisma migrate deploy
SEED_RESET=true SEED_ADMIN_EMAIL="admin@tudominio.com" SEED_ADMIN_PASSWORD="tu-password" npm run db:seed
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

---

## Seed (bootstrap)

El seed **no** carga cuentas demo. Crea un admin desde env, proveedores del Drive Media Kits 2026 y paquetes LED AMBA en borrador. Detalle: [docs/08-datos-demo.md](docs/08-datos-demo.md).

```bash
SEED_RESET=true \
SEED_ADMIN_EMAIL="admin@tudominio.com" \
SEED_ADMIN_PASSWORD="tu-password-seguro" \
npm run db:seed
```

`SEED_RESET=true` borra y recrea toda la base — usalo solo en el primer setup o un reset consciente (p. ej. shell de Render).

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run db:migrate` | Crear migración Prisma (`migrate dev`) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Bootstrap limpio (requiere `SEED_RESET=true` + admin env) |

---

## Estructura de rutas

```
/                        → Landing pública
/explorar                → Catálogo OOH (público)
/explorar/[id]           → Detalle con precio diferencial y reserva
/explorar/comparar       → Comparador de hasta 4 espacios
/explorar/last-minute    → Oportunidades con descuento
/explorar/circuitos      → Circuitos OOH agrupados
/register                → Registro diferenciado (Anunciante / Medio / Agencia)
/login                   → Inicio de sesión

/advertiser              → Mis solicitudes
/advertiser/planificar   → AI Planner con optimización de presupuesto
/advertiser/creativo     → Validación y mockup de creativos con IA

/provider                → Dashboard del Medio
/provider/inventario     → CRUD de espacios propios
/provider/inventario/nuevo → Cargar nuevo espacio
/provider/reservas       → Gestión de solicitudes
/provider/analytics      → Métricas de rendimiento

/agency                  → Panel de Agencia con comisiones
/agency/clientes         → Gestión de anunciantes clientes
/agency/comparar         → Comparador con vista de precios diferenciales

/admin                   → Backoffice completo
```

---

## Producción (Render)

Hay un Blueprint en [`render.yaml`](render.yaml): web service + Postgres.

1. **Commit y push** de `main` a GitHub (incluye `render.yaml` y el seed limpio).
2. En [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → conectá el repo `lucasmaksymon/directMediaPlanning`.
3. En el formulario del Blueprint completá las env con `sync: false`:
   - `AUTH_URL` = `https://nextplanning.onrender.com` (o la URL que te asigne Render)
   - `NEXT_PUBLIC_APP_URL` = la misma URL
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` = tu admin (para el seed manual)
   - Opcionales: `OPENAI_API_KEY`, `RESEND_API_KEY`, `UPLOADTHING_TOKEN`, etc.
4. Esperá el primer deploy (`migrate deploy` corre en el build).
5. **Una sola vez**, en el Shell del servicio web:
   ```bash
   SEED_RESET=true npm run db:seed
   ```
   (con `SEED_ADMIN_*` ya definidas en el servicio). Después dejá `SEED_RESET=false`.

Postgres free de Render caduca a los 30 días; para prod estable pasá el plan de la DB a pago.

