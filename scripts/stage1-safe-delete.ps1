# STAGE 1: Safe Deletion Script
# Run this AFTER reviewing Knip output
# This script will be populated with actual unused files after Knip analysis

param(
    [switch]$DryRun = $false
)

Write-Host "🗑️  STAGE 1: Safe Deletion Protocol" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray

# Delete placeholder folders (Next.js-style, not used by Vite)
$unusedFolders = @(
    "app",
    "components",
    "lib"
)

Write-Host "`n📁 Removing unused placeholder folders..." -ForegroundColor Yellow
foreach ($folder in $unusedFolders) {
    if (Test-Path $folder) {
        if ($DryRun) {
            Write-Host "   [DRY RUN] Would delete: $folder/" -ForegroundColor DarkGray
        } else {
            Remove-Item -Path $folder -Recurse -Force
            Write-Host "   ✅ Deleted: $folder/" -ForegroundColor Green
        }
    }
}

# Clean test artifacts (keep configs, delete reports)
$testArtifacts = @(
    "playwright-report",
    "test-results"
)

Write-Host "`n🧪 Cleaning test artifacts..." -ForegroundColor Yellow
foreach ($artifact in $testArtifacts) {
    if (Test-Path $artifact) {
        if ($DryRun) {
            Write-Host "   [DRY RUN] Would delete: $artifact/" -ForegroundColor DarkGray
        } else {
            Remove-Item -Path $artifact -Recurse -Force
            Write-Host "   ✅ Deleted: $artifact/" -ForegroundColor Green
        }
    }
}

# Knip Results: No unused files detected!
# All exports are either used or are part of component libraries (shadcn/ui)
# Unlisted dependency @supabase/postgrest-js is a peer dependency (safe to ignore)
$unusedSourceFiles = @()

if ($unusedSourceFiles.Count -gt 0) {
    Write-Host "`n📄 Removing unused source files..." -ForegroundColor Yellow
    foreach ($file in $unusedSourceFiles) {
        if (Test-Path $file) {
            if ($DryRun) {
                Write-Host "   [DRY RUN] Would delete: $file" -ForegroundColor DarkGray
            } else {
                Remove-Item -Path $file -Force
                Write-Host "   ✅ Deleted: $file" -ForegroundColor Green
            }
        }
    }
}

# Remove empty directories
Write-Host "`n📂 Cleaning empty directories..." -ForegroundColor Yellow
if (-not $DryRun) {
    Get-ChildItem -Path "src" -Recurse -Directory | 
        Where-Object { (Get-ChildItem $_.FullName -Recurse -File).Count -eq 0 } |
        ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Host "   ✅ Removed empty: $($_.FullName)" -ForegroundColor Green
        }
}

Write-Host "`n================================================" -ForegroundColor Gray
if ($DryRun) {
    Write-Host "✨ Dry run complete. Run without -DryRun to execute." -ForegroundColor Cyan
} else {
    Write-Host "✨ Cleanup complete!" -ForegroundColor Green
    Write-Host "⚠️  Run 'npm install' to sync package.json if dependencies were removed" -ForegroundColor Yellow
}
