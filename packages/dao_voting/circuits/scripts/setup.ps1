# ZKP Trusted Setup Script for Windows
# Run with: npm run circuits:setup

Write-Host "=== ZKP Trusted Setup (Powers of Tau) ===" -ForegroundColor Cyan
Write-Host ""

# 1. Robust Path Resolution (Works from ANY folder)
$ScriptPath = $MyInvocation.MyCommand.Path
$ScriptDir = Split-Path $ScriptPath
$CircuitDir = Join-Path $ScriptDir ".."
$BuildDir = Join-Path $CircuitDir "build"
$VoteBuildDir = Join-Path $BuildDir "vote"

# Define file paths
$PtauPath = Join-Path $BuildDir "powersOfTau28_hez_final_16.ptau"
$R1CS = Join-Path $VoteBuildDir "vote.r1cs"
$ZKey0 = Join-Path $VoteBuildDir "vote_0000.zkey"
$ZKeyFinal = Join-Path $VoteBuildDir "vote_final.zkey"
$VKey = Join-Path $VoteBuildDir "verification_key.json"

# Check if compile ran successfully
if (!(Test-Path $R1CS)) {
    Write-Host "Error: vote.r1cs not found at: $R1CS" -ForegroundColor Red
    Write-Host "Please run 'npm run circuits:compile' first." -ForegroundColor Yellow
    exit 1
}

# === 2. Download Powers of Tau (if not exists) ===
if (!(Test-Path $PtauPath)) {
    Write-Host "Downloading Powers of Tau file (70MB)..." -ForegroundColor Yellow
    
    # Using Google Storage mirror (faster/more reliable than AWS)
    $PtauUrl = "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_16.ptau"
    
    try {
        Invoke-WebRequest -Uri $PtauUrl -OutFile $PtauPath
        Write-Host "Powers of Tau downloaded" -ForegroundColor Green
    } catch {
        Write-Host "Failed to download Powers of Tau" -ForegroundColor Red
        Write-Error $_
        exit 1
    }
} else {
    Write-Host "Powers of Tau file found" -ForegroundColor Green
}

# === 3. Setup for Vote Circuit ===
Write-Host ""
Write-Host "Generating ZKeys..." -ForegroundColor Yellow

# Phase 2: Groth16 Setup
Write-Host "   -> Groth16 Setup (Phase 2)..."
cmd /c npx snarkjs groth16 setup "$R1CS" "$PtauPath" "$ZKey0"

if (!(Test-Path $ZKey0)) {
    Write-Host "Setup failed." -ForegroundColor Red
    exit 1
}

# Contribute randomness (Entropy)
Write-Host "   -> Contributing Entropy..."
# Generate random entropy string
$randomEntropy = -join ((1..64) | ForEach-Object { (Get-Random -Maximum 16).ToString("x") })

cmd /c npx snarkjs zkey contribute "$ZKey0" "$ZKeyFinal" --name="DAO_Voter_Contributor" -v -e="$randomEntropy"

if (!(Test-Path $ZKeyFinal)) {
    Write-Host "Contribution failed." -ForegroundColor Red
    exit 1
}

# Export Verification Key
Write-Host "   -> Exporting Verification Key..."
cmd /c npx snarkjs zkey export verificationkey "$ZKeyFinal" "$VKey"

if (Test-Path $VKey) {
    Write-Host ""
    Write-Host "Trusted Setup Complete!" -ForegroundColor Cyan
    Write-Host "   Final Key: $ZKeyFinal" -ForegroundColor Gray
    Write-Host "   Verifier JSON: $VKey" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next step: npm run circuits:verifier" -ForegroundColor Green
} else {
    Write-Host "Verification Key export failed." -ForegroundColor Red
    exit 1
}