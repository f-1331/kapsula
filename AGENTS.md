# AGENTS.md — Kapsula — Garderob & Stilist

## Stack
- **Runtime / UI**: Vite + React 19 + TypeScript (`strict: true`, `erasableSyntaxOnly: true`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + CSS custom properties in `src/styles/tokens.css`
- **Fonts**: Self-hosted `@fontsource/cormorant-garamond` (`latin` + `latin-ext`, regular & italic) and `@fontsource/inter` (`latin` + `latin-ext`). Both verified to contain `U+02BB` (`ʻ`) and `U+2019` (`’`).
- **Animation**: `motion` (`LazyMotion` + `domAnimation`, `MotionConfig reducedMotion="user"`)
- **Drag & Drop**: `@dnd-kit/core` (Pointer, Touch 150ms long-press, Keyboard sensors + `DragOverlay` + Uzbek announcements)
- **Color Math**: `culori` (OKLCH / OKLab / CIEDE2000)
- **State & Validation**: `zustand`, `zod`
- **Testing**: `vitest`

## Commands
- `npm run dev` — start local Vite dev server
- `npm run build` — `tsc -b && vite build`
- `npm run typecheck` — `tsc -b --noEmit`
- `npm test` — run Vitest unit & coverage suite (`vitest run`)

## Design Tokens (`src/styles/tokens.css`)
- `--paper`: `#F5F1E8` (main background)
- `--paper-2`: `#EEE8DB` (secondary surface)
- `--ink`: `#151412` (primary ink)
- `--ink-2`: `#3B3731` (secondary ink)
- `--muted`: `#655E53` (muted captions, WCAG AA checked on paper)
- `--hairline`: `#D8D0BF` (1px editorial borders)
- `--accent`: `#8F1D2C` (oxblood; reserved for focus rings, scores, active states)
- Sharp geometry (`0–2px` border radius), `1px` hairlines, no heavy box shadows, `3.5%` paper grain overlay.

## Asset Contract (`/public/assets/manifest.json`)
- `/assets/manifest.json` is the single source of truth; never hardcode garments or looks inside UI components.
- Validate via `ManifestSchema` (`src/data/schema.ts`); fall back gracefully to `src/data/sample-manifest.ts` if missing or invalid (showing a dev-only `"namuna ma’lumotlar"` banner).
- Garment images are transparent WebP cutouts (`object-fit: contain`, explicit `w`/`h` from manifest, CSS `drop-shadow`). Any missing or broken image must render the category SVG silhouette tinted with `garment.color`, never a broken icon.
- Lookbook photos sit in `2:3` frames (`object-cover`).

## Coding Standards
- **Language & Orthography**: All UI copy lives in `src/i18n/uz.ts` in polite Uzbek (`"siz"`). Always use `U+02BB` (`ʻ`) for `oʻ`/`gʻ` and `U+2019` (`’`) for apostrophes. Zero emoji anywhere in UI or copy.
- **Transparency**: The Stylist (`src/engine/stylist.ts`) and Color Engine (`src/engine/color.ts`) are 100% deterministic rule-based TypeScript with no LLM or API keys. Keep all weights and thresholds in `src/engine/config.ts`.
- **Accessibility & Performance**: Maintain WCAG AA contrast, semantic landmarks, full keyboard support, `aria-live` score announcements, `>= 44px` touch targets, `prefers-reduced-motion` support, and keep gzipped JS bundle `<= 250 KB`.
