# PowerShell helper to scaffold .env.local and .env from examples
# Usage (Windows PowerShell):
#   ./scripts/setup-env.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $root

function Ensure-File {
  param(
    [string]$Source,
    [string]$Target
  )
  if (Test-Path $Target) {
    Write-Host "Skip: $Target already exists"
  } elseif (Test-Path $Source) {
    Copy-Item $Source $Target
    Write-Host "Created: $Target (copied from $(Split-Path -Leaf $Source))"
  } else {
    Write-Host "Warning: Example file not found: $Source"
  }
}

# Create .env.local for Vite client
$envLocalExample = Join-Path $projectRoot ".env.local.example"
$envLocal = Join-Path $projectRoot ".env.local"
Ensure-File -Source $envLocalExample -Target $envLocal

# Create .env for Node scripts
$envExample = Join-Path $projectRoot ".env.example"
$envServer = Join-Path $projectRoot ".env"
Ensure-File -Source $envExample -Target $envServer

Write-Host "\nNext steps:"
Write-Host "- Edit .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY"
Write-Host "- Edit .env with SUPABASE_URL and keys for scripts (do NOT commit)"
