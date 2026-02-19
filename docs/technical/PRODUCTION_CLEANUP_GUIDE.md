# Production Grade Cleanup - Execution Guide

## 🎯 Objective
Consolidate all source code into `src/` and remove lockfile conflicts to meet production standards.

---

## 📋 What Will Be Changed

### Removed:
- ❌ `bun.lockb` (lockfile conflict)
- ❌ `app/` (unused Next.js API routes)
- ❌ `components/` (unused Mapbox form)
- ❌ `playwright-report/` (test artifacts)
- ❌ `test-results/` (test artifacts)
- ❌ `node_modules/` (will be reinstalled clean)

### Moved:
- ✅ `lib/validation/` → `src/lib/validation/`

### Kept:
- ✅ `src/features/` (already organized)
- ✅ `src/components/` (UI components)
- ✅ `src/services/` (Supabase)
- ✅ `src/lib/` (utilities)

---

## 🚀 Execution Steps

### Step 1: Run Cleanup Script
```powershell
.\scripts\production-cleanup.ps1
```

**What it does:**
1. Removes `bun.lockb`
2. Moves `lib/validation` to `src/lib/validation`
3. Deletes unused `app/` and `components/`
4. Cleans test artifacts
5. Runs `npm ci` for clean install

### Step 2: Fix Import Paths
```powershell
node scripts/fix-validation-imports.mjs
```

**What it does:**
- Updates any relative imports to use `@/lib/validation/report`

### Step 3: Verify Build
```powershell
npm run typecheck
npm run build
npm run test
```

---

## 📁 Final Structure

```
state-track/
├── src/
│   ├── features/          # Domain logic (auth, reports, map, admin, geodata, home)
│   ├── components/        # Shared UI (ui, common, layout)
│   ├── services/          # External integrations (Supabase)
│   ├── lib/               # Pure utilities + validation schemas
│   ├── views/             # Generic pages (Help, 404)
│   ├── hooks/             # Global hooks
│   ├── styles/            # Global styles
│   ├── App.tsx
│   ├── main.tsx
│   └── sw.ts
├── public/                # Static assets
├── docs/                  # Documentation
├── e2e/                   # E2E tests
├── scripts/               # Build scripts
├── supabase/              # Database migrations
└── package.json
```

---

## ⚠️ Rollback (If Needed)

```powershell
git checkout .
git clean -fd
npm ci
```

---

## ✅ Success Criteria

- [ ] No `bun.lockb` in root
- [ ] No `app/`, `components/`, `lib/` in root
- [ ] All validation imports use `@/lib/validation/*`
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes

---

## 📊 Benefits

1. **Single Source of Truth**: All code in `src/`
2. **No Lockfile Conflicts**: Only `package-lock.json`
3. **Clean Root**: Only config files at root level
4. **Scalable**: Feature-based architecture ready for growth
5. **Production Ready**: Meets industry standards
