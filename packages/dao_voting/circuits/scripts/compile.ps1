# ZKP Circuit Compilation Script for Windows
# Run with: powershell -ExecutionPolicy Bypass -File circuits/scripts/compile.ps1

Write-Host "=== ZKP Voting Circuit Compilation ===" -ForegroundColor Green
Write-Host ""

# Create build directories
Write-Host "Creating build directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "circuits/build" | Out-Null
New-Item -ItemType Directory -Force -Path "circuits/build/merkleTree" | Out-Null
New-Item -ItemType Directory -Force -Path "circuits/build/nullifier" | Out-Null
New-Item -ItemType Directory -Force -Path "circuits/build/vote" | Out-Null

# Check if circom is installed
if (!(Get-Command circom -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: circom not found!" -ForegroundColor Red
    Write-Host "Install with: npm install -g circom" -ForegroundColor Yellow
    exit 1
}

# === 1. Compile Merkle Tree Circuit ===
Write-Host ""
Write-Host "[1/3] Compiling Merkle Tree Circuit..." -ForegroundColor Yellow
circom circuits/merkleTree.circom --r1cs --wasm --sym --output circuits/build/merkleTree

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Merkle Tree circuit compiled" -ForegroundColor Green
} else {
    Write-Host "Error: Merkle Tree compilation failed" -ForegroundColor Red
    exit 1
}

# === 2. Compile Nullifier Circuit ===
Write-Host ""
Write-Host "[2/3] Compiling Nullifier Circuit..." -ForegroundColor Yellow
circom circuits/nullifier.circom --r1cs --wasm --sym --output circuits/build/nullifier

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Nullifier circuit compiled" -ForegroundColor Green
} else {
    Write-Host "Error: Nullifier compilation failed" -ForegroundColor Red
    exit 1
}

# === 3. Compile Vote Circuit ===
Write-Host ""
Write-Host "[3/3] Compiling Vote Circuit..." -ForegroundColor Yellow
circom circuits/vote.circom --r1cs --wasm --sym --output circuits/build/vote

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Vote circuit compiled" -ForegroundColor Green
} else {
    Write-Host "Error: Vote compilation failed" -ForegroundColor Red
    exit 1
}

# === Display Circuit Info ===
Write-Host ""
Write-Host "=== Circuit Information ===" -ForegroundColor Green
Write-Host "Merkle Tree:"
snarkjs r1cs info circuits/build/merkleTree/merkleTree.r1cs

Write-Host ""
Write-Host "Vote Circuit:"
snarkjs r1cs info circuits/build/vote/vote.r1cs

Write-Host ""
Write-Host "Success: All circuits compiled successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm run circuits:setup" -ForegroundColor Green
Write-Host "2. Run: npm run circuits:verifier" -ForegroundColor Green