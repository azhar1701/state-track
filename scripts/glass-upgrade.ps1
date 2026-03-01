$settingsDir = "src/features/admin/settings"
$files = Get-ChildItem "$settingsDir/*.tsx"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # 1. Card: border-0 shadow-md -> glass-floating border-0
    $content = $content -replace 'className="border-0 shadow-md"', 'className="glass-floating border-0"'
    
    # 2. div: bg-muted/30 rounded-lg p-3 border -> glass-base rounded-lg p-3
    $content = $content -replace 'className="bg-muted/30 rounded-lg p-3 border"', 'className="glass-base rounded-lg p-3"'
    
    # 3. div: bg-muted/30 rounded-lg p-4 border -> glass-base rounded-lg p-4
    $content = $content -replace 'className="bg-muted/30 rounded-lg p-4 border"', 'className="glass-base rounded-lg p-4"'
    
    # 4. div: bg-muted/30 rounded-lg p-4 border space-y-3 -> glass-base rounded-lg p-4 space-y-3
    $content = $content -replace 'className="bg-muted/30 rounded-lg p-4 border space-y-3"', 'className="glass-base rounded-lg p-4 space-y-3"'
    
    # 5. div: bg-muted/30 rounded-lg p-2 border flex items-center justify-between -> glass-base rounded-lg p-2 flex items-center justify-between
    $content = $content -replace 'className="bg-muted/30 rounded-lg p-2 border flex items-center justify-between"', 'className="glass-base rounded-lg p-2 flex items-center justify-between"'
    
    # 6. TabsList: add glass-surface rounded-xl
    $content = $content -replace 'className="grid w-full grid-cols-3 h-auto"', 'className="grid w-full grid-cols-3 h-auto glass-surface rounded-xl"'
    $content = $content -replace 'className="grid w-full grid-cols-4 h-auto"', 'className="grid w-full grid-cols-4 h-auto glass-surface rounded-xl"'
    $content = $content -replace 'className="grid w-full grid-cols-5 mb-6"', 'className="grid w-full grid-cols-5 mb-6 glass-surface rounded-xl"'
    $content = $content -replace 'className="grid w-full grid-cols-4 mb-6"', 'className="grid w-full grid-cols-4 mb-6 glass-surface rounded-xl"'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "Updated: $($file.Name)"
}

Write-Host "Done!"
