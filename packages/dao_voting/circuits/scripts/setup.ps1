# ZKP Trusted Setup Script for Windows
# Run with: powershell -ExecutionPolicy Bypass -File circuits/scripts/setup.ps1

Write-Host "=== ZKP Trusted Setup (Powers of Tau) ===" -ForegroundColor Green
Write-Host ""

$PTAU_FILE = "circuits/build/powersOfTau28_hez_final_16.ptau"

# === 1. Download Powers of Tau (if not exists) ===
if (!(Test-Path $PTAU_FILE)) {
    Write-Host "Downloading Powers of Tau file (70MB)..." -ForegroundColor Yellow
    Write-Host "This is a one-time download from Hermez ceremony"
    
    try {
        Invoke-WebRequest -Uri "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau" `
            -OutFile $PTAU_FILE -UseBasicParsing
        
        Write-Host "✓ Powers of Tau downloaded" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to download Powers of Tau" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ Powers of Tau file already exists" -ForegroundColor Green
}

# === 2. Setup for Vote Circuit ===
Write-Host ""
Write-Host "Setting up Vote circuit..." -ForegroundColor Yellow

# Generate proving key
Write-Host "Generating zkey (phase 1)..."
snarkjs groth16 setup `
    circuits/build/vote/vote.r1cs `
    $PTAU_FILE `
    circuits/build/vote/vote_0000.zkey

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Setup failed" -ForegroundColor Red
    exit 1
}

# Contribute to ceremony (random entropy)
Write-Host "Contributing random entropy..."
$randomEntropy = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })

snarkjs zkey contribute `
    circuits/build/vote/vote_0000.zkey `
    circuits/build/vote/vote_0001.zkey `
    --name="First contribution" `
    -e="$randomEntropy"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Contribution failed" -ForegroundColor Red
    exit 1
}

# Export verification key
Write-Host "Exporting verification key..."
snarkjs zkey export verificationkey `
    circuits/build/vote/vote_0001.zkey `
    circuits/build/vote/verification_key.json

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Export failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Vote circuit setup complete" -ForegroundColor Green

# === 3. Display Circuit Stats ===
Write-Host ""
Write-Host "=== Circuit Statistics ===" -ForegroundColor Green
snarkjs zkey export json circuits/build/vote/vote_0001.zkey circuits/build/vote/zkey.json
Write-Host "Verification key generated at: circuits/build/vote/verification_key.json" -ForegroundColor Green

Write-Host ""
Write-Host "✓ Trusted setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Run powershell -ExecutionPolicy Bypass -File circuits/scripts/generate-verifier.ps1" -ForegroundColor Yellow