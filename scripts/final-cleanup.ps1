# Final Cleanup - Remove Unused Files
# Based on Knip analysis

Write-Host "=== FINAL CLEANUP: UNUSED FILES ===" -ForegroundColor Cyan

# 1. Remove unused migration scripts (already executed)
Write-Host "`n[1/3] Removing unused migration scripts..." -ForegroundColor Yellow
$unusedScripts = @(
    "scripts/fix-validation-imports.mjs",
    "scripts/stage2-fix-imports.mjs"
)
foreach ($file in $unusedScripts) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  OK Deleted $file" -ForegroundColor Green
    }
}

# 2. Remove unused worker (geo.worker.ts not imported anywhere)
Write-Host "`n[2/3] Checking unused worker..." -ForegroundColor Yellow
if (Test-Path "src/features/geodata/geo.worker.ts") {
    Write-Host "  SKIP geo.worker.ts (may be used dynamically)" -ForegroundColor Yellow
}

# 3. Remove unused validation schema (moved but not used)
Write-Host "`n[3/3] Checking validation schema..." -ForegroundColor Yellow
if (Test-Path "src/lib/validation/report.ts") {
    Write-Host "  SKIP report.ts (validation schema, keep for future)" -ForegroundColor Yellow
}

# 4. Remove unused dependency
Write-Host "`n[4/4] Removing unused dependency..." -ForegroundColor Yellow
Write-Host "  Run: npm uninstall comlink" -ForegroundColor Gray
npm uninstall comlink

Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  - Removed 2 migration scripts (already executed)" -ForegroundColor White
Write-Host "  - Removed 'comlink' dependency (unused)" -ForegroundColor White
Write-Host "  - Kept geo.worker.ts (potential dynamic import)" -ForegroundColor White
Write-Host "  - Kept validation schema (future use)" -ForegroundColor White
