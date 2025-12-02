Write-Host "=== ZKP Voting Circuit Compilation ===" -ForegroundColor Cyan

# 1. robust Path Resolution (Works from ANY folder)
$ScriptPath = $MyInvocation.MyCommand.Path
$ScriptDir = Split-Path $ScriptPath
$CircuitDir = Join-Path $ScriptDir ".."  # Go up one level to 'circuits' folder
$BuildDir = Join-Path $CircuitDir "build"

# Define where node_modules might be (Monorepo support)
# Level 1: packages/dao_voting/node_modules (Local)
$LocalNodeModules = Join-Path $ScriptDir "..\..\node_modules"
# Level 2: Implementation/node_modules (Root Monorepo)
$RootNodeModules = Join-Path $ScriptDir "..\..\..\..\node_modules"

# Resolve absolute paths to avoid confusion
$CircuitDir = Resolve-Path $CircuitDir | Select-Object -ExpandProperty Path
$LocalNodeModules = $LocalNodeModules -replace '\\', '/'
$RootNodeModules = $RootNodeModules -replace '\\', '/'

Write-Host "📂 Circuit Dir: $CircuitDir" -ForegroundColor Gray
Write-Host "📚 Root Libs:   $RootNodeModules" -ForegroundColor Gray

# 2. Create Build Folder if it doesn't exist
if (!(Test-Path -Path $BuildDir)) {
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
    Write-Host "Created build directory: $BuildDir" -ForegroundColor Green
}

# 3. Compilation Function
function Compile-Circuit {
    param (
        [string]$FileName
    )
    $Name = [System.IO.Path]::GetFileNameWithoutExtension($FileName)
    $OutputDir = "$BuildDir/$Name"
    
    if (!(Test-Path -Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir | Out-Null
    }

    Write-Host "Compiling $Name..." -ForegroundColor Yellow
    
    # We pass BOTH paths to ensure we find circomlib wherever it is installed
    circom "$CircuitDir/$FileName" --r1cs --wasm --sym --c `
        -o "$OutputDir" `
        -l "$LocalNodeModules" `
        -l "$RootNodeModules"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $Name compiled successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ $Name compilation failed." -ForegroundColor Red
        exit 1
    }
}

# 4. Run Compilation
Compile-Circuit "merkleTree.circom"
Compile-Circuit "nullifier.circom"
Compile-Circuit "vote.circom"

Write-Host "🎉 All circuits compiled successfully!" -ForegroundColor Cyan