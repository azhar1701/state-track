# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-02
**Context:** React 18, Vite, TypeScript, Tailwind CSS, Supabase, Leaflet, Framer Motion

## OVERVIEW
This is SIPASDA, a professional geospatial dashboard and reporting application. It relies on a "Liquid Glass" design system, high-density map rendering, and robust offline-first capabilities (PWA).

## COMMANDS
```bash
# Development
npm run dev

# Testing (Vitest + Playwright)
npm run test           # Run all unit tests
npm run test:watch     # Watch mode
npx vitest run path/to/file.test.ts  # Run a single test file
npm run e2e            # Run Playwright E2E tests

# Verification & Build (CRITICAL: ZERO ERRORS REQUIRED)
npm run typecheck      # Must pass before commits
npm run lint           # Must pass before commits
npm run build          # Production build
npm run knip           # Dead code detection
```

## ARCHITECTURE & STRUCTURE
```text
src/
├── components/   # Reusable UI (shadcn/ui + custom glass components)
├── features/     # Domain-driven modules (map, reports, admin, auth, home)
├── hooks/        # Shared React hooks (e.g., useAuth, useNotifications)
├── services/     # Supabase client and API calls
└── views/        # Page-level components
```

## CODE STYLE & CONVENTIONS

### 1. UI / UX Design System (Liquid Glass)
- We use a 3-tier Glassmorphism elevation system defined in `src/index.css`:
  - `glass-surface`: Blur 8px (Base panels, Navbars)
  - `glass-floating`: Blur 16px, Shadow-xl (Cards, Map Controls, Overlays)
  - `glass-overlay`: Blur 24px, Saturate 180% (Modals, Detail Drawers, Tooltips)
- **Always** prefer these semantic classes over raw `bg-white/10 backdrop-blur` classes.
- Use `framer-motion` for layout transitions (e.g., `layoutId` for sliding pills) and `AnimatePresence` for mounting/unmounting components (like drawers or error messages).

### 2. Map Implementation (Leaflet)
- Map controls must be consolidated and use `glass-floating` styles.
- Avoid default Leaflet control positioning if it clutters the UI; prefer custom React components absolutely positioned over the `MapContainer`.
- Handle geospatial data efficiently: memoize heavy calculations, use clustering for dense markers, and ensure clean unmounting of map layers.

### 3. State & Data Fetching
- Use standard React hooks for local state.
- For Supabase interactions, handle network failures gracefully. The app is offline-capable, so mutations (like creating a report) must use the `enqueueReportForSync` outbox pattern if `!navigator.onLine`.

### 4. Typescript & Safety
- **STRICT**: No `any` or `@ts-ignore`. If a type is complex, define an interface.
- Explicitly type API responses from Supabase.
- Always run `npm run typecheck` after modifying structural types.

## ANTI-PATTERNS (FORBIDDEN)
- **Cumulative Layout Shift (CLS)**: Never use standard loading spinners for content blocks; ALWAYS use `Skeleton` components that match the final content shape.
- **Abrupt State Changes**: Do not instantly pop UI elements in/out. Use Framer Motion (`initial`, `animate`, `exit`) or CSS transitions.
- **Unstyled Map Controls**: Never leave default Leaflet gray buttons on the map. They break the Liquid Glass immersion.
- **Failing Silently**: Always use `logger.error` and `toast.error` for user-facing failures.

## WHERE TO LOOK
| Task | Location |
|------|----------|
| UI Components | `src/components/ui/` |
| Global CSS | `src/index.css` |
| Map Logic | `src/features/map/` |
| Form Submissions | `src/features/reports/ReportForm.tsx` |
