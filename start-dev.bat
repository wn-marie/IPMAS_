@echo off
echo ========================================
echo Starting IPMAS Development Servers
echo ========================================
echo.

echo Starting backend server on port 3001...
start "IPMAS Backend" cmd /k "cd backend && npm run dev"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting frontend server on port 3000...
start "IPMAS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Development servers started!
echo ========================================
echo.
echo Backend API: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to stop all servers...
pause > nul

echo.
echo Stopping servers...
taskkill /f /im node.exe > nul 2>&1
echo Servers stopped.
