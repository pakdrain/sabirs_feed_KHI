@echo off
echo ====================================
echo    Live CCTV Camera Monitor
echo ====================================
echo.
echo Starting camera monitoring system...
echo Your camera stream will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the development server
npx tsx server/index.ts

pause