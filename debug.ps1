# Debug script for BambiSleep Chat
# This script starts the application in debug mode with MongoDB connection

Write-Host "Starting BambiSleep Chat in debug mode..." -ForegroundColor Green

# Check if MongoDB is running
$mongoRunning = docker ps | Select-String -Pattern "bambisleep-mongodb"
if (-not $mongoRunning) {
    Write-Host "MongoDB container is not running. Starting it now..." -ForegroundColor Yellow
    docker-compose up -d mongodb
    Write-Host "Waiting for MongoDB to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Run the application in debug mode
Write-Host "Starting application with debugging enabled (--inspect)..." -ForegroundColor Green
Write-Host "Connect Chrome DevTools to chrome://inspect or use VS Code debugger" -ForegroundColor Cyan
npm run debug
