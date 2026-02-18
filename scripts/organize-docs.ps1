# Documentation Triage Script
# Moves .md files from root to organized docs/ structure

$rootPath = "c:\Users\PSDA\OneDrive\Documents\GitHub\state-track"

# Create docs structure
$docFolders = @(
    "docs\archive",
    "docs\guides",
    "docs\logs"
)

foreach ($folder in $docFolders) {
    $fullPath = Join-Path $rootPath $folder
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "Created: $folder" -ForegroundColor Green
    }
}

# Files to keep in root
$keepInRoot = @("README.md", "LICENSE", "CHANGELOG.md")

# Categorization rules
$categories = @{
    "guides" = @("*GUIDE*.md", "*QUICKSTART*.md", "*SETUP*.md", "*REFERENCE*.md")
    "logs" = @("*SUMMARY*.md", "*REPORT*.md", "*CHECKLIST*.md", "*STATUS*.md", "*COMPLETE*.md", "*FIXES*.md", "*FIX*.md", "*PATCH*.md")
}

# Get all .md files in root
$mdFiles = Get-ChildItem -Path $rootPath -Filter "*.md" -File | Where-Object {
    $keepInRoot -notcontains $_.Name
}

Write-Host "Moving $($mdFiles.Count) markdown files..." -ForegroundColor Cyan

foreach ($file in $mdFiles) {
    $moved = $false
    
    # Try guides first
    foreach ($pattern in $categories["guides"]) {
        if ($file.Name -like $pattern) {
            Move-Item -Path $file.FullName -Destination (Join-Path $rootPath "docs\guides") -Force
            Write-Host "-> guides\$($file.Name)" -ForegroundColor Yellow
            $moved = $true
            break
        }
    }
    
    # Then logs
    if (-not $moved) {
        foreach ($pattern in $categories["logs"]) {
            if ($file.Name -like $pattern) {
                Move-Item -Path $file.FullName -Destination (Join-Path $rootPath "docs\logs") -Force
                Write-Host "-> logs\$($file.Name)" -ForegroundColor Yellow
                $moved = $true
                break
            }
        }
    }
    
    # Finally archive
    if (-not $moved) {
        Move-Item -Path $file.FullName -Destination (Join-Path $rootPath "docs\archive") -Force
        Write-Host "-> archive\$($file.Name)" -ForegroundColor Gray
    }
}

Write-Host "Documentation organized!" -ForegroundColor Green
