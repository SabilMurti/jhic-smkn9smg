# MySkanilan Ecosystem - PowerShell Launcher for Windows
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         MYSCANILAN ECOSYSTEM - SMKN 9 SEMARANG (POWERSHELL)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js tidak ditemukan! Silakan install dari https://nodejs.org/" -ForegroundColor Red
    pause
    exit 1
}

# Ensure .env
if (-not (Test-Path "backend\.env")) {
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "Created backend\.env from .env.example" -ForegroundColor Green
    }
}

Write-Host "Memulai 3 proses terminal di latar belakang..." -ForegroundColor Yellow

# Start Backend Gateway
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Start Merchant POS
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\merchant-pos; npm run dev"

# Start Portal Web
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps\portal-web; npm run dev"

Write-Host ""
Write-Host "Layanan aktif di:" -ForegroundColor Green
Write-Host "  - Backend Gateway : http://localhost:4000" -ForegroundColor White
Write-Host "  - Web Kantin      : http://localhost:5173" -ForegroundColor White
Write-Host "  - Portal Web      : http://localhost:3000" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
