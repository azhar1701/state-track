# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-02
**Context:** React 18, Vite, TypeScript, Tailwind CSS, Supabase, Leaflet, Framer Motion

## OVERVIEW
SIPASDA is a geospatial reporting application for public infrastructure conditions. It uses a "Liquid Glass" design system and supports real-time synchronization between Admin, Map, and User modules via Supabase.

## STRUCTURE
```text
src/
├── components/   # Reusable UI (shadcn/ui + glass components)
├── features/     # Domain-driven modules
│   ├── admin/    # Dashboard, stats, system settings
│   ├── map/      # Core map engine (Leaflet), spatial analysis
│   └── reports/  # Report forms, outbox sync (offline-first)
├── hooks/        # Shared React hooks
├── lib/          # Utilities (formatting, security, logger)
└── services/     # Supabase client and generated types
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| UI Components | `src/components/ui/` | shadcn/ui base |
| Global CSS | `src/index.css` | Liquid Glass design system |
| Shared Formatters | `src/lib/formatters.ts` | Centralized date/location logic |
| Map Core | `src/features/map/MapView.tsx` | Entry point for map (Large: 2.1k LOC) |
| Admin Logic | `src/features/admin/AdminDashboard.tsx` | Admin entry point (Large: 1.9k LOC) |
| Real-time Sync | `src/features/map/MapView.tsx` | Supabase channel 'reports-changes' |

## CONVENTIONS
- **Liquid Glass System**: Use `glass-surface`, `glass-floating`, `glass-overlay` classes from `src/index.css`.
- **Framer Motion**: Always use for layout transitions and state changes (entrance animations).
- **Indonesian Language**: All user-facing text must be in Bahasa Indonesia.
- **Zero Errors**: Strictly no `any` types; must pass `typecheck` and `lint` before commit.

## ANTI-PATTERNS (FORBIDDEN)
- **Cumulative Layout Shift (CLS)**: Use `Skeleton` instead of raw spinners.
- **Shotgun Debugging**: Fix root causes in `lib/` or `hooks/` rather than patching views.
- **Large Views**: Logic should be moved to hooks (Current technical debt in `MapView.tsx`).

## COMMANDS
```bash
npm run dev           # Start development server
npm run typecheck      # Run TypeScript compiler
npm run lint           # Run ESLint
npm run build          # Production build
npm run knip           # Find dead code
```


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
