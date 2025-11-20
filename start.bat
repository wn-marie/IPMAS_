@echo off
echo 🌍 Starting IPMAS System...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
    echo.
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo ⚙️ Creating environment file...
    copy .env.example .env >nul 2>&1
    echo ✅ Environment file created (.env)
    echo.
)

echo 🚀 Starting IPMAS System...
echo.
echo 📊 Dashboard: http://localhost:3000
echo 📈 Reports: http://localhost:3000/reports
echo 🧪 Test Charts: http://localhost:3000/test-charts
echo 🏥 Health Check: http://localhost:3000/health
echo 📊 Metrics: http://localhost:3000/metrics
echo.
echo Press Ctrl+C to stop the server
echo.

npm start
