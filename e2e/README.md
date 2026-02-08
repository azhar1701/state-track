# 🎯 E2E Testing dengan Playwright + Leaflet Map

## 📚 Overview

Folder ini berisi comprehensive E2E testing suite untuk aplikasi SIPASDA (Peta Infrastructure Reporting & Tracking).

**Testing Framework:** Playwright (Modern, cross-browser automation)  
**Primary Focus:** Map interactions + Visual regression testing  
**Application Type:** React/Vite + Leaflet Map + TypeScript

---

## 📂 File Structure

### Core Test Files

| File | Purpose | Status |
|------|---------|--------|
| `smoke.spec.ts` | Basic smoke tests (app loads, peta visible) | ✅ Ready |
| `map-interaction.spec.ts` | Advanced map tests (drag, zoom, pan) | ✅ Ready |
| `advanced-e2e.spec.ts` | Complex workflows + integration tests | 🔄 Optional |

### Utility Files

| File | Purpose | Usage |
|------|---------|-------|
| `map-utils.ts` | Reusable map interaction helpers | `import { dragMapToLocation } from './map-utils'` |
| `selectors.ts` | Centralized selectors & locators | `import { selectors } from './selectors'` |

### Documentation

| File | Purpose | Read When |
|------|---------|-----------|
| `QUICK_START.md` | 5-minute setup guide | 🚀 First time setup |
| `MAP_TESTING_GUIDE.md` | Comprehensive guide (30+ pages) | 📖 Deep dive |
| `CHEAT_SHEET.md` | Quick reference card | 🔍 During development |
| `README.md` | This file | 📋 Overview |

### Auto-Generated Files

| Folder | Content | Managed By |
|--------|---------|-----------|
| `__screenshots__/` | Baseline snapshot images | Playwright (auto-generated) |
| `__video__/` | Test execution videos | Playwright (optional) |

---

## 🚀 Quick Start (2 Minutes)

### 1. Run Tests with UI Dashboard
```bash
npm run e2e:ui
```
Opens interactive dashboard to run + debug tests.

### 2. Run Tests Headless (Fast)
```bash
npm run e2e
```
Quick test run without opening browser.

### 3. View Results
```bash
npx playwright show-report
```
Opens HTML report with screenshots + videos.

---

## 🎯 Test Suite Structure

### 1️⃣ Smoke Tests (`smoke.spec.ts`)
✅ **What:** Basic health checks  
✅ **When:** Every deploy  
✅ **Duration:** < 30 seconds

```
Tests:
├── aplikasi harus load tanpa crash dan menampilkan peta
├── navbar harus menampilkan elemen utama
├── tidak ada console error saat halaman load
└── aplikasi harus responsive di mobile
```

### 2️⃣ Map Interaction Tests (`map-interaction.spec.ts`)
📊 **What:** Map behavior verification  
📊 **When:** Before merge (map-related changes)  
📊 **Duration:** 2-3 minutes

```
Tests organized by category:
├── MAP PANNING (4 tests)
│   ├── drag peta ke arah kanan
│   ├── drag peta ke arah atas
│   └── drag peta secara diagonal
├── ZOOM INTERACTIONS (4 tests)
│   ├── zoom in menggunakan mouse wheel
│   ├── zoom out menggunakan mouse wheel
│   ├── double click harus zoom in
│   └── zoom in harus load tile baru
├── VISUAL REGRESSION TESTING (3 tests)
│   ├── [SNAPSHOT] default map view harus konsisten
│   ├── [SNAPSHOT] map setelah zoom in harus valid
│   └── [SNAPSHOT] map setelah pan harus valid
├── WAITING STRATEGY TESTS (2 tests)
├── COMBINATION TESTS (2 tests)
└── TROUBLESHOOTING TESTS (2 debug tests)
```

### 3️⃣ Advanced E2E Tests (`advanced-e2e.spec.ts`)
🔬 **What:** Complex user workflows  
🔬 **When:** Before release (integration tests)  
🔬 **Duration:** 5-10 minutes (optional, skip-by-default)

```
Tests:
├── Map + Form Integration
│   ├── user dapat explore peta kemudian submit laporan
│   └── visual tracking - map state changes
├── Multi-Step Workflows
├── Performance Testing
├── Accessibility Testing
└── Mobile/Responsive Testing
```

---

## 🔧 How to Use

### Run Specific Test Category

```bash
# Only smoke tests
npx playwright test --grep "smoke"

# Only map interaction tests
npx playwright test e2e/map-interaction.spec.ts

# Only visual regression tests
npx playwright test --grep "SNAPSHOT"

# Only zoom tests
npx playwright test --grep "zoom"
```

### Run with Specific Browser

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# All browsers (default)
npm run e2e
```

### Debug Tests

```bash
# Interactive debug mode (step-by-step)
npm run e2e:debug

# Headed mode (see browser)
npm run e2e:headed

# UI mode (interactive dashboard)
npm run e2e:ui
```

### Manage Snapshots (Visual Regression)

```bash
# Generate baseline snapshots (first time)
npx playwright test --update-snapshots

# Compare with baseline (next runs - automatic)
npm run e2e

# If visual diff detected, review and decide:
npx playwright show-report
# Then either:
# - Update baseline: npx playwright test -u
# - Or fix code and rerun: npm run e2e
```

---

## 📚 Learning Path

### 🟢 Beginner (30 minutes)
1. Read this README
2. Run `npm run e2e:ui`
3. Click on any test to see execution
4. Read `QUICK_START.md`

### 🟡 Intermediate (1-2 hours)
1. Study `MAP_TESTING_GUIDE.md` (sections 1-2)
2. Look at `map-interaction.spec.ts` source code
3. Try running individual tests
4. Generate baselines: `npx playwright test -u`
5. Review report: `npx playwright show-report`

### 🔴 Advanced (2-4 hours)
1. Deep-dive `map-utils.ts` implementation
2. Read full `MAP_TESTING_GUIDE.md`
3. Create new test scenarios
4. Implement custom waiting strategies
5. Set up CI/CD integration

---

## 💡 Key Concepts

### 1. Waiting Strategies
**Problem:** Leaflet peta render dalam `<canvas>`, sulit ditest  
**Solution:** Use appropriate waiting strategy

```typescript
import { waitForMapReady } from './map-utils';

await page.goto('/');
await waitForMapReady(page);  // ← Wait for network idle + map visible
```

**4 Available Strategies:**
- `waitForMapReady()` - Network idle (⭐ recommended)
- `waitForMapElement()` - Wait for DOM element
- `waitForTileLoading()` - Wait for tile images
- `waitForMapStable()` - Wait for animation to stop

### 2. Visual Regression Testing
**Problem:** Styling changes hard to detect manually  
**Solution:** Automated screenshot comparison

```bash
# First run: Generate baseline
npx playwright test --update-snapshots

# Next runs: Auto-compare (fail if pixels differ)
npm run e2e
```

### 3. Map Interaction Helpers
**Problem:** Complex map interactions hard to code  
**Solution:** Reusable utility functions

```typescript
import { dragMapToLocation, zoomMap } from './map-utils';

await dragMapToLocation(page, 400, 300, 200, 200);  // Pan
await zoomMap(page, 'in', 3);                        // Zoom
```

---

## 🎨 Visual Regression Best Practices

### ✅ DO:
1. **Generate baseline on stable code:** First run should be on working version
2. **Review diffs carefully:** Use `npx playwright show-report`
3. **Use masking for dynamic content:** Hide timestamps, counters
4. **Commit baselines to git:** So team can see intentional changes
5. **Update only on intentional changes:** Don't skip visual review

### ❌ DON'T:
1. Don't auto-update snapshots in CI/CD
2. Don't ignore pixel differences without review
3. Don't use overly large `maxDiffPixels` threshold
4. Don't test too many browsers (start with Chromium)
5. Don't screenshot full page for canvas elements (only visible area)

---

## 🐛 Troubleshooting

### Issue: Tests Timeout

```
Timeout exceeded (30000ms)
```

**Solutions:**
1. Ensure dev server running: `npm run dev`
2. Check network connectivity
3. Increase timeout: `await page.waitForTimeout(60000)`
4. Use better waiting strategy: `await waitForMapReady(page)`

### Issue: Map Element Not Found

```
Element is not visible
```

**Solutions:**
1. Add proper wait: `await waitForMapReady(page)`
2. Verify selector: Use browser DevTools
3. Check viewport: Is element in view?

### Issue: Snapshot Mismatch

```
Expected image to match baseline
```

**Solutions:**
1. Review diff: `npx playwright show-report`
2. If intentional: `npx playwright test -u`
3. If not: Fix code and rerun

### Issue: Network Timeout on Tiles

```
waitForTileLoading timeout
```

**Solutions:**
1. Check tile provider URL (OpenStreetMap? Custom?)
2. Monitor network: `page.on('response', ...)`
3. Use fallback: `await page.waitForLoadState('networkidle')`

---

## 📊 Test Metrics & CI Integration

### GitHub Actions Workflow
Automatic test running on:
- ✅ Push to `main` or `develop`
- ✅ Pull requests
- ✅ Node 18.x and 20.x
- ✅ Artifacts: HTML report + test results

**File:** `.github/workflows/playwright-e2e.yml`

### Local Pre-Commit
```bash
npm run typecheck  # Type checking
npm run lint       # Linting
npm run e2e        # E2E tests
```

### Performance
- Smoke tests: **< 30 seconds**
- Map interaction tests: **2-3 minutes**
- All tests: **3-5 minutes** (parallel browsers)

---

## 📖 Documentation Files

| Document | Best For | Read Time |
|----------|----------|-----------|
| **QUICK_START.md** | First-time setup | 5 min |
| **CHEAT_SHEET.md** | Quick reference | 5 min (lookup) |
| **MAP_TESTING_GUIDE.md** | Deep understanding | 30 min |
| **This README** | Overview | 10 min |

---

## 🚀 Next Steps

1. **Start testing:**
   ```bash
   npm run e2e:ui
   ```

2. **Create baseline:**
   ```bash
   npx playwright test --update-snapshots
   ```

3. **Review baseline:**
   ```bash
   npx playwright show-report
   ```

4. **Commit baseline:**
   ```bash
   git add e2e/__screenshots__/
   git commit -m "test: add visual regression baselines"
   ```

5. **Integrate with CI/CD:**
   - GitHub Actions already configured in `.github/workflows/`
   - Push to trigger automatic test runs

---

## 📞 Need Help?

### Quick Questions
→ Check `CHEAT_SHEET.md`

### How-to Guides
→ Read `QUICK_START.md`

### Deep Dive
→ Study `MAP_TESTING_GUIDE.md`

### Implementation Details
→ Review source code in `map-utils.ts`

### Specific Issue
→ Check "Troubleshooting Tests" in `map-interaction.spec.ts`

---

## 🎓 Resources

- 📖 [Playwright Docs](https://playwright.dev)
- 🗺️ [Leaflet Docs](https://leafletjs.com)
- 🎬 [Visual Testing Guide](https://playwright.dev/docs/test-snapshots)
- ⏱️ [Waiting Guide](https://playwright.dev/docs/navigations)
- 🐛 [Debugging](https://playwright.dev/docs/debug)

---

## 📝 Version Info

- **Playwright:** v1.40.0+
- **Application:** React + Vite + Leaflet
- **Node:** 18.x or 20.x
- **Test Count:** 20+ tests (16 active, 4 optional)
- **Coverage:** Map interactions, visual regression, smoke tests

---

**Happy Testing! 🎉**

For quick reference → See `CHEAT_SHEET.md`  
For setup help → See `QUICK_START.md`  
For detailed guide → See `MAP_TESTING_GUIDE.md`
