#!/bin/bash
# ============================================================
# uPharma - Offline Pharmacy Management System
# Installer for Linux/Mac (SQLite - No Internet Required)
# ============================================================

echo ""
echo " ============================================"
echo "   uPharma - Offline Pharmacy Management"
echo " ============================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo ""
    echo "Install it with:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Mac: brew install node"
    echo ""
    exit 1
fi

echo "[OK] Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "[1/4] Installing dependencies..."
npm install --production 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[ERROR] npm install failed."
    exit 1
fi
echo "[OK] Dependencies installed."
echo ""

# Setup database
echo "[2/4] Setting up database..."
mkdir -p prisma
echo "DATABASE_URL=file:./prisma/upharma.db" > .env

npx prisma generate 2>/dev/null
echo "[OK] Prisma client generated."
echo ""

# Create tables
echo "[3/4] Creating database tables..."
npx prisma db push 2>/dev/null
echo "[OK] Database tables created."
echo ""

# Seed
echo "[4/4] Creating admin user..."
npx prisma db seed 2>/dev/null
echo ""

echo " ============================================"
echo "   SETUP COMPLETE!"
echo " ============================================"
echo ""
echo "  Login: admin / admin123"
echo ""
echo "  To start uPharma:"
echo "    ./start.sh"
echo "    Then open: http://localhost:3000"
echo ""
