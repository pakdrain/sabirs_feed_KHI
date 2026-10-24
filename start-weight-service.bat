@echo off
echo ========================================
echo Starting Weight Serial Service
echo ========================================
echo.
echo This will connect to your COM3 weight scale
echo and provide real-time weight data to the web interface.
echo.
echo Make sure your weight indicator is connected to COM3
echo and powered on before running this service.
echo.
echo Press any key to start the service...
pause >nul

echo.
echo Starting weight service on port 3001...
echo.

node serial-weight-service.js

echo.
echo Weight service has stopped.
pause