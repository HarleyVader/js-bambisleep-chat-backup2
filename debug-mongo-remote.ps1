# Debug MongoDB on Remote Machine
# Usage: .\debug-mongo-remote.ps1

Write-Host "=== MongoDB Remote Debug Script ===" -ForegroundColor Cyan
Write-Host "Connecting to remote machine: brandynette@192.168.0.72" -ForegroundColor Yellow

# Step 1: Check if Docker is running
Write-Host "`n1. Checking Docker status..." -ForegroundColor Green
ssh brandynette@192.168.0.72 "docker --version && docker info --format '{{.ServerVersion}}'"

# Step 2: Check MongoDB container status
Write-Host "`n2. Checking MongoDB container..." -ForegroundColor Green
ssh brandynette@192.168.0.72 "docker ps -a | grep bambisleep-mongodb"

# Step 3: Check container logs
Write-Host "`n3. Getting MongoDB logs (last 20 lines)..." -ForegroundColor Green
ssh brandynette@192.168.0.72 "docker logs --tail 20 bambisleep-mongodb"

# Step 4: Check port binding
Write-Host "`n4. Checking port 27018..." -ForegroundColor Green
ssh brandynette@192.168.0.72 "netstat -tulpn | grep 27018 || ss -tulpn | grep 27018"

# Step 5: Test MongoDB connectivity
Write-Host "`n5. Testing MongoDB connection..." -ForegroundColor Green
ssh brandynette@192.168.0.72 "docker exec bambisleep-mongodb mongosh --host localhost --port 27017 --eval 'db.adminCommand(\"ping\")' --quiet"

Write-Host "`n=== Debug Complete ===" -ForegroundColor Cyan
