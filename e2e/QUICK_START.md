# 🚀 Quick Start: Map Testing dengan Playwright

## 5-Minute Setup

### 1. Install Dependencies

```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Verify Installation

```bash
npx playwright --version
# Output: Version 1.40.0 (atau lebih baru)
```

### 3. Run First Test

**Terminal 1 - Start dev server:**
```bash
npm run dev
# Server running at http://localhost:8080
```

**Terminal 2 - Run tests:**
```bash
npm run e2e:ui
```

Ini akan:
- ✅ Open Playwright Test Inspector
- ✅ Run semua tests interaktively
- ✅ Live reload saat code berubah

---

## 📋 Test Files Overview

### File Structure
```
e2e/
├── smoke.spec.ts          # Basic smoke tests ✅
├── map-interaction.spec.ts # Advanced map tests (NEW!)
├── map-utils.ts           # Reusable utilities & helpers (NEW!)
├── selectors.ts           # Centralized selectors
├── MAP_TESTING_GUIDE.md    # Comprehensive guide (NEW!)
└── __screenshots__/        # Baseline snapshots (auto-generated)
    ├── chromium/
    └── firefox/
```

### What's in Each File?

**`smoke.spec.ts`** - Basic tests
- ✅ Aplikasi load tanpa crash
- ✅ Judul halaman contains "SIPASDA"
- ✅ Peta visible
- ✅ Console error check
- ✅ Mobile responsive check

**`map-interaction.spec.ts`** - Advanced map tests
- ✅ Drag & Drop (Pan)
- ✅ Zoom In/Out
- ✅ Double Click
- ✅ Visual Regression (Snapshots)
- ✅ Network Waiting Strategies
- ✅ Combined Interactions

**`map-utils.ts`** - Reusable Functions
- `waitForMapReady()` - Network idle waiting
- `dragMapToLocation()` - Pan map
- `zoomMap()` - Zoom in/out
- `takeMapSnapshot()` - Screenshot dengan auto-wait
- `getMapBounds()` - Get current map bounds
- `getMapZoomLevel()` - Get current zoom

---

## 🎯 Common Commands

### Running Tests

| Command | Purpose | Speed |
|---------|---------|-------|
| `npm run e2e` | Run all tests (headless) | ⚡ Fast |
| `npm run e2e:headed` | Run with browser visible | 🔍 Visual |
| `npm run e2e:ui` | Interactive UI mode | 🎮 Best for dev |
| `npm run e2e:debug` | Step-by-step debug | 🐛 Debugging |

### Snapshot / Visual Regression

```bash
# First run: Generate baseline snapshots
npx playwright test --update-snapshots

# Regular runs: Compare with baseline (auto)
npm run e2e

# View report with diffs
npx playwright show-report
```

### Specific Test Filtering

```bash
# Run specific test file
npx playwright test e2e/map-interaction.spec.ts

# Run tests matching pattern
npx playwright test --grep "zoom"

# Run only smoke tests
npx playwright test --grep "smoke"

# Run visual regression only
npx playwright test --grep "SNAPSHOT"
```

### Single Browser Testing

```bash
# Only Chromium
npx playwright test --project=chromium

# Only Firefox
npx playwright test --project=firefox

# Only Safari
npx playwright test --project=webkit
```

---

## 🎨 Visual Regression Testing - Step by Step

### Step 1: Generate Baselines (FIRST TIME)

```bash
npx playwright test e2e/map-interaction.spec.ts --update-snapshots
```

**Output:**
```
Playwright generates baseline images at:
e2e/__screenshots__/map-interaction/chromium/
├── map-default-view.png
├── map-zoomed-view.png
└── map-panned-view.png
```

### Step 2: Review Baselines

```bash
npx playwright show-report
```

Opens interactive report. Check:
- ✅ Default map looks correct?
- ✅ Zoomed view acceptable? 
- ✅ Panned view OK?

### Step 3: Regular Test Runs (Auto Compare)

```bash
npm run e2e
```

Playwright akan:
- 🔍 Compare new screenshots dengan baseline
- 📊 Calculate pixel differences
- ❌ FAIL jika diff > threshold (maxDiffPixels: 100)

### Step 4: If Visual Diff Detected

```bash
npx playwright show-report
```

Report akan show:
- **Expected:** baseline image
- **Actual:** current screenshot  
- **Diff:** highlighted differences (red)

**Decision:**
- ✅ Perbedaan OK? Update baseline: `npx playwright test -u`
- ❌ Perbedaan tidak boleh? Fix code, re-run: `npm run e2e`

### Step 5: Commit Baseline

```bash
git add e2e/__screenshots__/
git commit -m "docs: add visual regression baselines"
```

---

## 🚨 Troubleshooting

### Problem 1: Tests Timeout

```
Error: Timeout exceeded (30000ms)
```

**Check:**
1. Dev server running? `npm run dev`
2. Port correct? Should be `8080`
3. Network good? Check tile loading

**Fix:**
```bash
# Increase timeout
npx playwright test --timeout=60000
```

### Problem 2: Snapshots Not Matching

```
Expected image to match baseline
```

**Options:**
1. **Intentional changes?** Update baseline:
   ```bash
   npx playwright test -u && npx playwright show-report
   ```

2. **Rendering differences?** Adjust threshold:
   ```typescript
   // In test file
   await expect(page).toHaveScreenshot('map.png', {
     threshold: 0.5,  // More tolerant
   });
   ```

3. **Multiple browsers?** Test single browser:
   ```bash
   npx playwright test --project=chromium
   ```

### Problem 3: Cannot Find Map Element

```
Element is not visible
```

**Fix:**
```typescript
// Ensure proper waiting
import { waitForMapReady } from './map-utils';

test('test', async ({ page }) => {
  await page.goto('/');
  await waitForMapReady(page);  // ← Add this
  // ... rest of test
});
```

---

## 📚 Learning Path

### Beginner Path (30 min)
1. ✅ Run smoke tests: `npm run e2e:ui`
2. ✅ Review test file: `e2e/smoke.spec.ts`
3. ✅ Check reports: `npx playwright show-report`

### Intermediate Path (1-2 hours)
1. ✅ Read `MAP_TESTING_GUIDE.md`
2. ✅ Run map interaction tests: `npm run e2e:ui`
3. ✅ Generate baselines: `npx playwright test -u`
4. ✅ Review visual diffs: `npx playwright show-report`

### Advanced Path (2-4 hours)
1. ✅ Deep-dive map-utils.ts source
2. ✅ Create custom waiting strategy
3. ✅ Add new test scenarios (form submission, etc)
4. ✅ Integrate with CI/CD (GitHub Actions)

---

## 🔧 Configuration Files

### `playwright.config.ts`
Main configuration:
- Test directory: `./e2e`
- Base URL: `http://localhost:8080`
- Web server: Auto-start `npm run dev`
- Reporters: HTML, JSON, JUnit
- Image matching: threshold 0.2%, maxDiff 100px
- Browsers: Chromium, Firefox, WebKit, Mobile

### `.github/workflows/playwright-e2e.yml`
CI/CD configuration:
- Runs on: Ubuntu latest
- Trigger: Push to main/develop, PR
- Node versions: 18.x, 20.x
- Artifacts: HTML report, test results

### `.gitignore` (Updated)
```ignore
# Playwright artifacts
test-results/
playwright-report/
```

---

## 💡 Pro Tips

### 1. Use `test.only()` for Quick Testing
```typescript
// Only run this test
test.only('harus bisa zoom in', async ({ page }) => {
  // ...
});
```

### 2. Skip Tests Temporarily
```typescript
// Skip this test
test.skip('broken test', async ({ page }) => {
  // ...
});
```

### 3. Use Descriptive Names
```typescript
// ✅ GOOD
test('[SNAPSHOT] map default view should remain consistent', async ({...}) => {});

// ❌ BAD
test('test 1', async ({...}) => {});
```

### 4. Organize with Describe Blocks
```typescript
test.describe('Map Pan Tests', () => {
  test('pan left', async ({...}) => {});
  test('pan right', async ({...}) => {});
  test('pan diagonal', async ({...}) => {});
});
```

### 5. Monitor Network Requests
```typescript
page.on('response', (response) => {
  if (response.url().includes('tile')) {
    console.log(`Tile loaded: ${response.status()}`);
  }
});
```

---

## 🆘 Ask for Help

### Debug Mode
```bash
npm run e2e:debug
# Inspect element, step through code
```

### View Browser
```bash
npm run e2e:headed
# Watch test execution in real browser
```

### Check Logs
```bash
# Test output with verbose logging
npx playwright test --reporter=verbose
```

---

## ✨ Next Steps

1. **Run tests in UI mode:**
   ```bash
   npm run e2e:ui
   ```

2. **Generate baselines:**
   ```bash
   npx playwright test e2e/map-interaction.spec.ts -u
   ```

3. **Review report:**
   ```bash
   npx playwright show-report
   ```

4. **Modify map, test again:**
   ```bash
   npm run e2e
   ```

5. **Commit baseline:**
   ```bash
   git add e2e/__screenshots__/
   git commit -m "test: add visual regression baselines for map"
   ```

---

**Happy Testing! 🎉**

Questions? Check `MAP_TESTING_GUIDE.md` for comprehensive documentation.

