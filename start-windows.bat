@echo off
chcp 65001 > nul
title MySkanilan Ecosystem Launcher - SMKN 9 Semarang

echo ======================================================================
echo          MYSCANILAN ECOSYSTEM - SMKN 9 SEMARANG (WINDOWS)
echo ======================================================================
echo.
echo [1/3] Memeriksa instalasi Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan! Silakan download & install Node.js dari:
    echo         https://nodejs.org/
    pause
    exit /b 1
)

echo [2/3] Memeriksa file konfigurasi backend\.env...
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo       backend\.env berhasil dibuat otomatis dari .env.example.
    )
)

echo [3/3] Memulai Layanan MySkanilan di 3 Jendela Terminal Terpisah...
echo.

:: 1. Jalankan Backend Gateway
start "MySkanilan - Backend Gateway (Port 4000)" cmd /k "title Backend Gateway (Port 4000) && cd backend && npm run dev"

:: 2. Jalankan Kantin POS & Self-Order
start "MySkanilan - Kantin POS (Port 5173)" cmd /k "title Kantin POS (Port 5173) && cd apps\merchant-pos && npm run dev"

:: 3. Jalankan Portal Web Siswa & Wali
start "MySkanilan - Portal Web (Port 3000)" cmd /k "title Portal Web (Port 3000) && cd apps\portal-web && npm run dev"

echo.
echo ======================================================================
echo  Semua layanan sedang berjalan di jendela Command Prompt masing-masing:
echo   - Backend Gateway : http://localhost:4000
echo   - Web Kantin      : http://localhost:5173
echo   - Portal Web      : http://localhost:3000
echo ======================================================================
echo.
echo Membuka Portal Web di browser default...
timeout /t 3 >nul
start http://localhost:3000
echo.
echo Tekan sembarang tombol untuk menutup jendela launcher ini (layanan tetap berjalan).
pause >nul
