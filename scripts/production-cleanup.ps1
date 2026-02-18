# Production Grade Cleanup Script
# Removes lockfile conflicts and consolidates source code into src/

Write-Host "=== PRODUCTION GRADE CLEANUP ===" -ForegroundColor Cyan

# 1. Remove Bun lockfile (we use NPM)
Write-Host "`n[1/5] Removing Bun lockfile..." -ForegroundColor Yellow
if (Test-Path "bun.lockb") {
    Remove-Item "bun.lockb" -Force
    Write-Host "  OK Removed bun.lockb" -ForegroundColor Green
}

# 2. Move lib/validation to src/lib/validation
Write-Host "`n[2/5] Consolidating lib/ into src/..." -ForegroundColor Yellow
if (Test-Path "lib/validation") {
    if (-not (Test-Path "src/lib/validation")) {
        New-Item -ItemType Directory -Path "src/lib/validation" -Force | Out-Null
    }
    Move-Item "lib/validation/*" "src/lib/validation/" -Force
    Remove-Item "lib" -Recurse -Force
    Write-Host "  OK Moved lib/validation to src/lib/validation" -ForegroundColor Green
}

# 3. Delete unused Next.js placeholders
Write-Host "`n[3/5] Removing unused Next.js placeholders..." -ForegroundColor Yellow
$unusedFolders = @("app", "components")
foreach ($folder in $unusedFolders) {
    if (Test-Path $folder) {
        Remove-Item $folder -Recurse -Force
        Write-Host "  OK Deleted $folder/" -ForegroundColor Green
    }
}

# 4. Clean test artifacts
Write-Host "`n[4/5] Cleaning test artifacts..." -ForegroundColor Yellow
$testArtifacts = @("playwright-report", "test-results")
foreach ($artifact in $testArtifacts) {
    if (Test-Path $artifact) {
        Remove-Item $artifact -Recurse -Force
        Write-Host "  OK Deleted $artifact/" -ForegroundColor Green
    }
}

# 5. Clean install with npm
Write-Host "`n[5/5] Clean npm install..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "  Removing node_modules..." -ForegroundColor Gray
    Remove-Item "node_modules" -Recurse -Force
}
Write-Host "  Running npm ci..." -ForegroundColor Gray
npm ci

Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Update imports: node scripts/fix-validation-imports.mjs" -ForegroundColor White
Write-Host "  2. Verify build: npm run build" -ForegroundColor White
Write-Host "  3. Run tests: npm run test" -ForegroundColor White
