# Generate Solidity Verifier Script for Windows
# Run with: powershell -ExecutionPolicy Bypass -File circuits/scripts/generate-verifier.ps1

Write-Host "=== Generating Solidity Verifier ===" -ForegroundColor Green
Write-Host ""

# === 1. Generate Solidity verifier contract ===
Write-Host "Exporting Solidity verifier..." -ForegroundColor Yellow
snarkjs zkey export solidityverifier `
    circuits/build/vote/vote_0001.zkey `
    contracts/core/VoteVerifier.sol

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Verifier contract generated" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to generate verifier" -ForegroundColor Red
    exit 1
}

# === 2. Modify contract for better integration ===
Write-Host ""
Write-Host "Optimizing verifier contract..." -ForegroundColor Yellow

# Add SPDX license and rename contract
$content = Get-Content contracts/core/VoteVerifier.sol -Raw
$content = "// SPDX-License-Identifier: MIT`n" + $content
$content = $content -replace "contract Verifier", "contract VoteVerifier"
$content | Set-Content contracts/core/VoteVerifier.sol -NoNewline

Write-Host "✓ Verifier contract optimized" -ForegroundColor Green

# === 3. Display contract info ===
Write-Host ""
Write-Host "=== Verifier Contract Generated ===" -ForegroundColor Green
Write-Host "Location: contracts/core/VoteVerifier.sol" -ForegroundColor Green
Write-Host "Contract name: VoteVerifier" -ForegroundColor Green

# Get contract size
$fileSize = (Get-Item contracts/core/VoteVerifier.sol).Length
Write-Host "Size: $fileSize bytes" -ForegroundColor Yellow

Write-Host ""
Write-Host "✓ Solidity verifier ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review: contracts/core/VoteVerifier.sol" -ForegroundColor Green
Write-Host "2. Compile contracts: npm run compile" -ForegroundColor Green
Write-Host "3. Run tests: npm run test:zkp" -ForegroundColor Green