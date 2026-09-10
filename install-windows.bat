@echo off
chcp 65001 > nul
title MySkanilan - Windows Setup & Installer

echo ======================================================================
echo       MYSCANILAN ECOSYSTEM - WINDOWS SETUP & INSTALLATION
echo                     SMKN 9 Semarang
echo ======================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terinstal! Silakan download & install Node.js (v20+):
    echo         https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] NPM tidak ditemukan!
    pause
    exit /b 1
)

echo [1/5] Menginstal & Build Middleware SDK (@myskanilan/sdk)...
cd packages\myskanilan-sdk
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal build SDK!
    cd ..\..
    pause
    exit /b 1
)
cd ..\..

echo.
echo [2/5] Menginstal Backend Gateway & Ledger...
cd backend
call npm install
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo       backend\.env berhasil dibuat.
    )
)
call npm run build
cd ..

echo.
echo [3/5] Menginstal Web Kantin POS...
cd apps\merchant-pos
call npm install
cd ..\..

echo.
echo [4/5] Menginstal Portal Web Siswa & Wali...
cd apps\portal-web
call npm install
cd ..\..

echo.
echo [5/5] Melakukan Seeding Data Awal ke MongoDB...
echo       (Pastikan MongoDB Service di Windows sudah berjalan!)
cd backend
call npm run seed
cd ..

echo.
echo ======================================================================
echo  SETUP SELESAI! Seluruh dependensi & data awal berhasil disiapkan.
echo  Untuk menjalankan sistem, silakan klik ganda: start-windows.bat
echo ======================================================================
echo.
pause
