@echo off
echo ====================================
echo    Enhanced Camera Monitor
echo ====================================
echo.
echo Starting improved camera monitoring with auto-recovery...
echo Your camera stream will be available at: http://localhost:5000
echo.
echo Features:
echo - Automatic stream restart when camera moves
echo - No manual play button needed after interruptions
echo - Enhanced connection stability
echo.
echo Press Ctrl+C to stop the server
echo.

REM Set environment variable for improved stream handling
set CAMERA_AUTO_RECOVERY=true

REM Start the development server
npx tsx server/index.ts

pause