#!/bin/bash
set -e  # Exit on any error

echo "=== IPMAS Build Script ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install root dependencies (skip dev deps, skip scripts to avoid puppeteer download)
echo "=== Installing root dependencies ==="
npm install --only=production --ignore-scripts --no-audit --no-fund || true

# Install backend dependencies (skip puppeteer postinstall to save time)
echo "=== Installing backend dependencies ==="
cd backend
# Skip puppeteer postinstall script which downloads Chromium
PUPPETEER_SKIP_DOWNLOAD=true npm install --production --ignore-scripts --no-audit --no-fund
cd ..

# Install frontend dependencies (minimal - only for build script)
echo "=== Installing frontend dependencies ==="
cd frontend
npm install --ignore-scripts --no-audit --no-fund || npm install --no-audit --no-fund

# Build frontend (simple copy, no webpack needed)
echo "=== Building frontend ==="
node build.js

cd ..

echo "=== ✅ Build complete! ==="

