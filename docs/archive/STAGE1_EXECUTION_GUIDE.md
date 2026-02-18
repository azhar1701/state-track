# 🛑 STAGE 1: THE DEEP CLEAN - Execution Guide

## Prerequisites
```powershell
npm install -D knip
```

---

## Step-by-Step Execution

### 1️⃣ Organize Documentation
```powershell
.\scripts\stage1-organize-docs.ps1
```
**What it does:** Moves `MAPVIEW_PATCH.txt` and `QUICK_PATCH.txt` to `docs/patches/`

---

### 2️⃣ Run Knip (Dead Code Detection)
```powershell
npx knip
```

**Expected Output:**
- ✅ **Unused files**: Files imported nowhere
- ✅ **Unused exports**: Exported but never imported
- ✅ **Unused dependencies**: In package.json but never imported
- ⚠️ **False positives**: Review carefully (e.g., Vite plugins, type-only imports)

**Save the report:**
```powershell
npx knip --reporter json > knip-report.json
```

---

### 3️⃣ Review Knip Output
**Manual Review Checklist:**
- [ ] Check if reported files are truly unused (not dynamically imported)
- [ ] Verify dependencies (some are build-time only)
- [ ] Ignore false positives (Vite config, type definitions)

**Common False Positives to IGNORE:**
- `vite.config.ts` imports (plugins, etc.)
- `tailwind.config.ts` imports
- Type-only imports (`import type { ... }`)
- Service Worker (`src/sw.ts`) - may appear unused but is registered in `vite.config.ts`

---

### 4️⃣ Update Deletion Script
Edit `scripts/stage1-safe-delete.ps1`:
1. Add unused files from Knip to `$unusedSourceFiles` array
2. Add unused dependencies to a new `$unusedDeps` array (optional)

Example:
```powershell
$unusedSourceFiles = @(
    "src/components/OldComponent.tsx",
    "src/lib/deprecatedUtil.ts"
)
```

---

### 5️⃣ Dry Run (Safety Check)
```powershell
.\scripts\stage1-safe-delete.ps1 -DryRun
```
**Review the output carefully!** This shows what WOULD be deleted.

---

### 6️⃣ Execute Deletion
```powershell
.\scripts\stage1-safe-delete.ps1
```

**What it deletes:**
- ✅ Placeholder folders: `app/`, `components/`, `lib/` (Next.js-style, unused)
- ✅ Test artifacts: `playwright-report/`, `test-results/`
- ✅ Unused source files (from Knip report)
- ✅ Empty directories

---

### 7️⃣ Verify & Test
```powershell
# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build

# Test
npm run test
```

---

## 🚨 STOP HERE
**Do NOT proceed to Stage 2 until:**
1. ✅ All tests pass
2. ✅ Build succeeds
3. ✅ You've confirmed the app runs (`npm run dev`)

---

## Rollback (If Something Breaks)
```powershell
git checkout .
git clean -fd
```

---

## Expected Results
- 📉 Reduced bundle size
- 🧹 Cleaner `src/` directory
- 📦 Fewer dependencies in `package.json`
- 🎯 Only production-relevant code remains

**Report back with:**
1. Knip output summary
2. Number of files deleted
3. Any issues encountered
