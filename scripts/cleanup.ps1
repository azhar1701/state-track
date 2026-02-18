# Phase 3: Cleanup Script
# Removes unused files and dependencies detected by Knip

$rootPath = "c:\Users\PSDA\OneDrive\Documents\GitHub\state-track"

Write-Host "`n=== PHASE 3: CLEANUP ===" -ForegroundColor Cyan

# Unused files to delete (106 files)
$unusedFiles = @(
    "scripts\migrate-layers.mjs",
    "src\examples\MapLayerIntegration.example.tsx",
    "src\hooks\use-toast.ts",
    "src\hooks\useAutosave.ts",
    "src\hooks\useCategoryConfig.ts",
    "src\hooks\useFastGeoData.ts",
    "src\hooks\useGeoLayerConfig.ts",
    "src\hooks\useGeoWorker.ts",
    "src\hooks\useHaptic.ts",
    "src\hooks\useLayerEvents.ts",
    "src\hooks\useMapLayers.ts",
    "src\hooks\useMapResize.ts",
    "src\hooks\useOptimizedGeoData.ts",
    "src\hooks\useOptimizedLayers.ts",
    "src\hooks\useReportConfig.ts",
    "src\hooks\useReportDetailURL.ts",
    "src\hooks\useSwipeGesture.ts",
    "src\hooks\useSwipeGesture.tsx",
    "src\components\ConnectionIndicator.tsx",
    "src\components\FloatingActionButton.tsx",
    "src\components\OfflineState.tsx",
    "src\components\PerformanceMonitor.tsx",
    "src\components\StatusTimeline.tsx",
    "src\lib\geoCache.ts",
    "src\lib\geoExport.ts",
    "src\lib\geoOptimizer.ts",
    "src\lib\helpTexts.ts",
    "src\lib\imageUtils.ts",
    "src\lib\notifications.ts",
    "src\lib\securityMiddleware.ts",
    "src\lib\spatialQueries.ts",
    "src\stores\mapStore.ts",
    "src\pages\GeoDataManager.backup.tsx",
    "src\pages\MapWithLayerDrawer.tsx",
    "src\pages\OptimizedMapView.tsx",
    "src\pages\WorkOrders.tsx",
    "src\types\ambient.d.ts",
    "src\components\common\AnimatedStatCard.tsx",
    "src\components\common\HelpTooltip.tsx",
    "src\components\common\ImageGallery.tsx",
    "src\components\common\OptimizedImage.tsx",
    "src\components\common\PullToRefresh.tsx",
    "src\components\common\ReportSkeleton.tsx",
    "src\components\common\ShareSheet.tsx",
    "src\components\common\VoiceInput.tsx",
    "src\components\layout\ContentCard.tsx",
    "src\components\layout\index.ts",
    "src\components\layout\MainLayout.tsx",
    "src\components\layout\PageHeader.tsx",
    "src\components\layout\StatusBadge.tsx",
    "src\components\layouts\DashboardLayout.tsx",
    "src\components\report\PhotoUploadProgress.tsx",
    "src\components\report\WizardStep.tsx",
    "src\components\map\AdvancedClustering.tsx",
    "src\components\map\AdvancedSearch.tsx",
    "src\components\map\CustomPopup.tsx",
    "src\components\map\DrawControls.tsx",
    "src\components\map\DrawMeasureTools.tsx",
    "src\components\map\ExportPanel.tsx",
    "src\components\map\LayerControlPanel.tsx",
    "src\components\map\LayerFixes.tsx",
    "src\components\map\LayerPreview.tsx",
    "src\components\map\MapLayerRenderer.tsx",
    "src\components\map\MapToolbar.tsx",
    "src\components\map\QuickFilters.tsx",
    "src\components\map\ReportDetailSkeleton.tsx",
    "src\components\map\ResponsiveMapContainer.tsx",
    "src\components\map\SidePanel.tsx",
    "src\components\map\SpatialQueryBuilder.tsx",
    "src\components\map\StyleEditor.tsx",
    "src\components\map\SuperClusterMap.tsx",
    "src\components\map\TimeSlider.tsx",
    "src\components\map\VirtualizedReportList.tsx",
    "src\components\ui\animated-card.tsx",
    "src\components\ui\aspect-ratio.tsx",
    "src\components\ui\avatar.tsx",
    "src\components\ui\breadcrumb.tsx",
    "src\components\ui\calendar.tsx",
    "src\components\ui\carousel.tsx",
    "src\components\ui\collapsible.tsx",
    "src\components\ui\context-menu.tsx",
    "src\components\ui\form.tsx",
    "src\components\ui\glass-button.tsx",
    "src\components\ui\glass-card.tsx",
    "src\components\ui\glass-input.tsx",
    "src\components\ui\glass-modal.tsx",
    "src\components\ui\hover-card.tsx",
    "src\components\ui\input-otp.tsx",
    "src\components\ui\menubar.tsx",
    "src\components\ui\navigation-menu.tsx",
    "src\components\ui\popover.tsx",
    "src\components\ui\radio-group.tsx",
    "src\components\ui\resizable.tsx",
    "src\components\ui\sidebar.tsx",
    "src\components\ui\toast.tsx",
    "src\components\ui\toaster.tsx",
    "src\components\ui\toggle-group.tsx",
    "src\components\ui\toggle-variants.ts",
    "src\components\ui\toggle.tsx",
    "src\components\ui\use-toast.ts",
    "src\components\admin\settings\DangerZone.tsx",
    "src\components\admin\settings\index.ts",
    "src\components\admin\settings\SettingsRow.tsx",
    "src\components\admin\settings\SettingsSection.tsx",
    "src\components\admin\settings\StyleManager.tsx",
    "src\components\admin\settings\ThemeSettings.tsx"
)

# Delete unused files
Write-Host "`nDeleting $($unusedFiles.Count) unused files..." -ForegroundColor Yellow
$deletedCount = 0
foreach ($file in $unusedFiles) {
    $fullPath = Join-Path $rootPath $file
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Force
        $deletedCount++
    }
}
Write-Host "Deleted $deletedCount files" -ForegroundColor Green

# Remove empty directories
Write-Host "`nRemoving empty directories..." -ForegroundColor Yellow
$emptyDirs = Get-ChildItem -Path (Join-Path $rootPath "src") -Directory -Recurse | 
    Where-Object { (Get-ChildItem $_.FullName -Recurse -File).Count -eq 0 } |
    Sort-Object -Property FullName -Descending

foreach ($dir in $emptyDirs) {
    Remove-Item $dir.FullName -Force -Recurse
    Write-Host "Removed: $($dir.FullName.Replace($rootPath, ''))" -ForegroundColor Gray
}

Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm uninstall @hello-pangea/dnd @hookform/resolvers @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-hover-card @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-radio-group @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @tanstack/react-query @types/dompurify html2canvas i18next i18next-browser-languagedetector i18next-http-backend input-otp react-day-picker react-hook-form react-i18next react-resizable-panels react-virtuoso use-supercluster zustand"
Write-Host "2. Run: npm uninstall -D @tailwindcss/postcss @tailwindcss/typography @testing-library/jest-dom @testing-library/react @types/testing-library__react baseline-browser-mapping jest tailwindcss-variable-colors"
Write-Host "3. Run: npm install workbox-core workbox-precaching workbox-routing workbox-strategies workbox-expiration @types/geojson @radix-ui/react-visually-hidden"
Write-Host "4. Run: npm run build (to verify)"
