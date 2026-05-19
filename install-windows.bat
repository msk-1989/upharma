@echo off
:: ============================================================
:: uPharma - Offline Pharmacy Management System
:: Installer for Windows PC (SQLite - No Internet Required)
:: ============================================================
echo.
echo  ============================================
echo    uPharma - Offline Pharmacy Management
echo  ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo 1. Open https://nodejs.org in your browser
    echo 2. Download the LTS version (18.x or 20.x)
    echo 3. Install it (click Next, Next, Install)
    echo 4. Restart your computer
    echo 5. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

:: Install dependencies
echo [1/4] Installing dependencies...
call npm install --production 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.
echo.

:: Setup SQLite database
echo [2/4] Setting up database...
if not exist prisma mkdir prisma

:: Create .env for SQLite
echo DATABASE_URL=file:./prisma/upharma.db> .env

:: Generate Prisma client
call npx prisma generate 2>nul
echo [OK] Prisma client generated.
echo.

:: Create database tables
echo [3/4] Creating database tables...
call npx prisma db push 2>nul
echo [OK] Database tables created.
echo.

:: Seed admin user and settings
echo [4/4] Creating admin user...
call npx prisma db seed 2>nul
echo.

echo  ============================================
echo    SETUP COMPLETE!
echo  ============================================
echo.
echo  Login: admin / admin123
echo.
echo  To start uPharma:
echo    1. Double-click: start.bat
echo    2. Open browser: http://localhost:3000
echo.
echo  To stop: Press Ctrl+C in the server window
echo.
pause
