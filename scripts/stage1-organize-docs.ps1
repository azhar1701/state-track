# STAGE 1: Organize Documentation
# Moves root-level patch notes to docs/patches/

Write-Host "🧹 STAGE 1: Organizing Documentation..." -ForegroundColor Cyan

# Create patches folder
$patchesDir = "docs/patches"
if (-not (Test-Path $patchesDir)) {
    New-Item -ItemType Directory -Path $patchesDir -Force | Out-Null
    Write-Host "✅ Created $patchesDir" -ForegroundColor Green
}

# Move patch files
$patchFiles = @("MAPVIEW_PATCH.txt", "QUICK_PATCH.txt")
foreach ($file in $patchFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "$patchesDir/$file" -Force
        Write-Host "✅ Moved $file → $patchesDir/" -ForegroundColor Green
    }
}

Write-Host "`n✨ Documentation organized!" -ForegroundColor Green
