# STAGE 2: Feature-Based Architecture Migration
# Reorganizes src/ using Domain-Driven Design principles

Write-Host "STAGE 2: Architectural Restructuring" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray

# Create feature directories
$features = @(
    "src/features/auth",
    "src/features/reports",
    "src/features/map",
    "src/features/admin",
    "src/features/geodata",
    "src/features/home"
)

Write-Host "`nCreating feature directories..." -ForegroundColor Yellow
foreach ($dir in $features) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Write-Host "   OK $dir" -ForegroundColor Green
}

# Move auth feature
Write-Host "`nMigrating auth feature..." -ForegroundColor Yellow
Move-Item "src/pages/Auth.tsx" "src/features/auth/" -Force
Move-Item "src/contexts/AuthContext.tsx" "src/features/auth/" -Force
Move-Item "src/contexts/auth-context.ts" "src/features/auth/" -Force
Move-Item "src/hooks/useAuth.ts" "src/features/auth/" -Force
Remove-Item "src/contexts" -Force -ErrorAction SilentlyContinue
Write-Host "   OK Auth feature migrated" -ForegroundColor Green

# Move reports feature
Write-Host "`nMigrating reports feature..." -ForegroundColor Yellow
Move-Item "src/pages/ReportForm.tsx" "src/features/reports/" -Force
Move-Item "src/pages/ReportSuccess.tsx" "src/features/reports/" -Force
Move-Item "src/pages/MyReports.tsx" "src/features/reports/" -Force
Move-Item "src/hooks/useOutboxSync.ts" "src/features/reports/" -Force
Move-Item "src/lib/outbox.ts" "src/features/reports/" -Force
Write-Host "   OK Reports feature migrated" -ForegroundColor Green

# Move map feature
Write-Host "`nMigrating map feature..." -ForegroundColor Yellow
Move-Item "src/pages/MapView.tsx" "src/features/map/" -Force
Move-Item "src/components/map/*" "src/features/map/" -Force
Move-Item "src/lib/geocoding.ts" "src/features/map/" -Force
Move-Item "src/lib/mapExport.ts" "src/features/map/" -Force
Move-Item "src/lib/routeOptimization.ts" "src/features/map/" -Force
Move-Item "src/lib/spatialAnalysis.ts" "src/features/map/" -Force
Move-Item "src/hooks/useLayerHighlight.ts" "src/features/map/" -Force
Move-Item "src/hooks/useLayerManager.ts" "src/features/map/" -Force
Remove-Item "src/components/map" -Force -ErrorAction SilentlyContinue
Write-Host "   OK Map feature migrated" -ForegroundColor Green

# Move admin feature
Write-Host "`nMigrating admin feature..." -ForegroundColor Yellow
Move-Item "src/pages/AdminDashboard.tsx" "src/features/admin/" -Force
Move-Item "src/components/admin/*" "src/features/admin/" -Force
Move-Item "src/hooks/useAppSettings.ts" "src/features/admin/" -Force
Move-Item "src/hooks/useBackupConfig.ts" "src/features/admin/" -Force
Move-Item "src/hooks/useSecurityConfig.ts" "src/features/admin/" -Force
Move-Item "src/hooks/useSystemSettings.ts" "src/features/admin/" -Force
Remove-Item "src/components/admin" -Force -ErrorAction SilentlyContinue
Write-Host "   OK Admin feature migrated" -ForegroundColor Green

# Move geodata feature
Write-Host "`nMigrating geodata feature..." -ForegroundColor Yellow
Move-Item "src/pages/GeoDataManager.tsx" "src/features/geodata/" -Force
Move-Item "src/components/geodata/*" "src/features/geodata/" -Force
Move-Item "src/components/import/*" "src/features/geodata/" -Force
Move-Item "src/lib/geoFixer.ts" "src/features/geodata/" -Force
Move-Item "src/workers/geo.worker.ts" "src/features/geodata/" -Force
Remove-Item "src/components/geodata" -Force -ErrorAction SilentlyContinue
Remove-Item "src/components/import" -Force -ErrorAction SilentlyContinue
Remove-Item "src/workers" -Force -ErrorAction SilentlyContinue
Write-Host "   OK Geodata feature migrated" -ForegroundColor Green

# Move home feature
Write-Host "`nMigrating home feature..." -ForegroundColor Yellow
Move-Item "src/pages/Home.tsx" "src/features/home/" -Force
Move-Item "src/components/home/*" "src/features/home/" -Force
Remove-Item "src/components/home" -Force -ErrorAction SilentlyContinue
Write-Host "   OK Home feature migrated" -ForegroundColor Green

# Keep shared components
Write-Host "`nOrganizing shared components..." -ForegroundColor Yellow
$sharedComponents = @(
    "src/components/BottomNav.tsx",
    "src/components/CommandMenu.tsx",
    "src/components/ErrorBoundary.tsx",
    "src/components/Footer.tsx",
    "src/components/InstallPrompt.tsx",
    "src/components/KeyboardShortcuts.tsx",
    "src/components/Navbar.tsx",
    "src/components/NotificationPrompt.tsx",
    "src/components/OfflineIndicator.tsx",
    "src/components/PageLoader.tsx",
    "src/components/ThemeToggle.tsx"
)
New-Item -ItemType Directory -Path "src/components/layout" -Force | Out-Null
foreach ($comp in $sharedComponents) {
    if (Test-Path $comp) {
        Move-Item $comp "src/components/layout/" -Force
    }
}
Write-Host "   OK Layout components organized" -ForegroundColor Green

# Rename pages to views
Write-Host "`nOrganizing remaining pages..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "src/views" -Force | Out-Null
Move-Item "src/pages/HelpCenter.tsx" "src/views/" -Force
Move-Item "src/pages/NotFound.tsx" "src/views/" -Force
Remove-Item "src/pages" -Force -ErrorAction SilentlyContinue
Write-Host "   OK Views organized" -ForegroundColor Green

# Organize lib as services
Write-Host "`nOrganizing services..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "src/services" -Force | Out-Null
Move-Item "src/integrations/supabase/*" "src/services/" -Force
Remove-Item "src/integrations" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   OK Services organized" -ForegroundColor Green

# Keep lib for pure utilities
Write-Host "`nKeeping utility lib..." -ForegroundColor Yellow
Write-Host "   OK lib/utils.ts, lib/security.ts retained" -ForegroundColor Green

# Clean up empty hooks directory
Remove-Item "src/hooks" -Force -ErrorAction SilentlyContinue

Write-Host "`n================================================" -ForegroundColor Gray
Write-Host "Architecture restructured!" -ForegroundColor Green
Write-Host "`nNew structure:" -ForegroundColor Cyan
Write-Host "   src/features/     - Domain logic (auth, reports, map, admin, geodata, home)" -ForegroundColor White
Write-Host "   src/components/   - Shared UI (ui/, common/, layout/)" -ForegroundColor White
Write-Host "   src/services/     - External integrations (Supabase)" -ForegroundColor White
Write-Host "   src/lib/          - Pure utilities" -ForegroundColor White
Write-Host "   src/views/        - Generic pages (Help, 404)" -ForegroundColor White
