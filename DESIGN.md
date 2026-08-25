# NextPlanning Design System

**Apple-inspired interaction & layout** + **NextMedia brand identity**.

Source of truth for all UI work. Do not introduce Apple Blue, generic SaaS purple themes, or decorative glassmorphism.

---

## 1. Visual Theme & Atmosphere

NextPlanning is a premium media-planning product for NextMedia — urban OOH, campaigns, and activation.

| Feel | Avoid |
|------|--------|
| Premium, precise, calm chrome | Apple Store clone |
| Urban, visual, professional | Generic Tailwind dashboard |
| Quiet UI, loud product content | Neon / gaming / glass everywhere |
| Strategic cyan accents | Painting the whole UI cyan |

**Principle:** Chrome recedes. Content (inventory photos, KPIs, tables, maps) speaks. Brand cyan marks selection, focus, primary CTA, and emphasis — not decoration.

---

## 2. Color Palette & Roles

Brand colors come from the product / landing family. **Do not replace with Apple `#0066cc`.**

| Token | Role | Value (light) |
|-------|------|----------------|
| `--primary` / `--led` | Brand primary, CTA, focus | `#00b6c7` |
| `--primary-foreground` | Text on primary | `#071012` |
| `--background` | Page canvas | `#f7f9fa` |
| `--foreground` | Primary text (carbon) | `#071012` |
| `--card` / surface | Elevated panels | `#ffffff` |
| `--muted` | Subtle fills | `rgba(7,16,18,0.06)` |
| `--muted-foreground` | Secondary text | `#5a6567` |
| `--border` | Hairlines | `rgba(7,16,18,0.12)` |
| `--ocean` / `--petroleum` | Dark surfaces | `#081820` / `#003a3a` |
| `--electric` | Limited accent | `#1f8fff` |
| `--purple` | Limited accent | `#b84dff` |
| `--energy` | Highlight / warning accent | `#ffe600` |
| `--signal` | Warning / urgency | `#ff7a00` |
| `--highlight` | Rare marketing accent | `#ff2daa` |
| `--success` / `--warning` / `--error` / `--info` | Semantic status | see `globals.css` |

**Rules**
- Primary cyan for CTA, active nav, focus rings, key KPIs.
- Semantic colors for status — never rely on color alone.
- Accents (purple, pink, energy) only for marketing moments or rare badges.

---

## 3. Typography Rules

| Role | Font | Usage |
|------|------|--------|
| Display | Bebas Neue | Marketing heroes, wordmark only |
| UI | Inter | All product UI |

**Scale (closed set)**
- `display` — marketing only
- `page-title` — 24–28px / semibold Inter
- `section-title` — 18–20px / semibold
- `card-title` — 16px / semibold
- `body` — 14–15px / regular
- `secondary` — 14px / muted
- `caption` / `label` / `metadata` — 12–13px

Do not use Bebas Neue for admin/panel page titles.

---

## 4. Component Styling

- **Buttons:** primary (solid cyan), secondary (border), ghost, destructive. Sentence case in product UI; uppercase only for marketing CTAs.
- **Inputs:** shared height (~40–44px), radius `md`, quiet border, cyan focus ring.
- **Cards:** thin border, no default glow; radius `lg`. Prefer sections on canvas over nested cards.
- **Tables:** dense, clear headers, subtle row hover, contextual actions.
- **Badges/chips:** minimal; semantic variants only.

---

## 5. Layout Principles

1. Where am I? (PageHeader)
2. What matters? (primary content / KPI)
3. Primary action
4. Secondary actions / filters
5. Detail / history

**Spacing:** 4-based scale — 4, 8, 12, 16, 24, 32, 48.

**Dashboards:** one hero metric → compact KPI row → main content → secondary. Not a mosaic of equal cards.

---

## 6. Depth & Elevation

1. Flat canvas + hairline borders (default)
2. Soft shadow (`shadow-sm`) for floating menus / dialogs
3. No large shadows, no cyan glow on chrome
4. Optional subtle glow only on primary CTA hover

---

## 7. Interaction & Motion

- Duration 150–250ms, ease-out
- Use motion for feedback, open/close, state change
- Honor `prefers-reduced-motion`
- No decorative scale on dense form buttons

---

## 8. Responsive Behavior

- Sidebar → drawer / sheet below `lg`
- Tables: hide low-priority columns; stable horizontal scroll when needed
- Touch targets ≥ 44px where interactive
- No accidental horizontal page scroll

---

## 9. Agent / UI Implementation Rules

1. Change **tokens → shared components → screens** — never one-off page CSS.
2. Never swap NextMedia brand colors for Apple/other palettes.
3. Do not change business logic, APIs, auth, or permissions for visual work.
4. One icon family: `lucide-react`.
5. Avoid AI-design clichés: purple gradients, glass everywhere, giant radii, icon-in-colored-square decoration.
6. Prefer `src/components/ui/*` and patterns (`PageHeader`, `FilterBar`, `EmptyState`, `Stat`).
7. After UI changes, spot-check all portals for leftover legacy styles.
