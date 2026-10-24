Write-Host "====================================" -ForegroundColor Green
Write-Host "   Live CCTV Camera Monitor" -ForegroundColor Green  
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting camera monitoring system..." -ForegroundColor Yellow
Write-Host "Your camera stream will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

# Start the development server
npx tsx server/index.ts

Read-Host "Press Enter to exit"