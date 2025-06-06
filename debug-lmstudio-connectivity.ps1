# LMStudio Connectivity Debug Script
# This script helps debug connectivity issues between your chat server and LMStudio

Write-Host "`n🔍 LMStudio Connectivity Debugging Tool" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

$LMStudioHost = "192.168.0.72"
$LMStudioPort = 7777
$LocalHost = "192.168.0.69"  # Your machine's IP

Write-Host "`n📊 Configuration:" -ForegroundColor Yellow
Write-Host "  LMStudio Host: $LMStudioHost"
Write-Host "  LMStudio Port: $LMStudioPort"
Write-Host "  Your IP: $LocalHost"

# Test 1: Basic connectivity
Write-Host "`n🏓 Test 1: Basic Ping Test" -ForegroundColor Green
$pingResult = Test-Connection -ComputerName $LMStudioHost -Count 2 -Quiet
if ($pingResult) {
    Write-Host "  ✅ Ping successful - Host is reachable" -ForegroundColor Green
} else {
    Write-Host "  ❌ Ping failed - Host unreachable" -ForegroundColor Red
    exit 1
}

# Test 2: Port connectivity
Write-Host "`n🔌 Test 2: Port Connectivity Test" -ForegroundColor Green
$portTest = Test-NetConnection -ComputerName $LMStudioHost -Port $LMStudioPort -WarningAction SilentlyContinue
Write-Host "  TCP Test Result: $($portTest.TcpTestSucceeded)" -ForegroundColor $(if($portTest.TcpTestSucceeded) {"Green"} else {"Red"})
Write-Host "  RTT: $($portTest.PingReplyDetails)"

# Test 3: Check local firewall rules
Write-Host "`n🛡️ Test 3: Local Firewall Rules" -ForegroundColor Green
$localRules = Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*LMStudio*" -or $_.DisplayName -like "*7777*"}
if ($localRules) {
    Write-Host "  ✅ Found LMStudio firewall rules:" -ForegroundColor Green
    $localRules | Select-Object DisplayName, Direction, Action, Enabled | Format-Table -AutoSize
} else {
    Write-Host "  ⚠️ No specific LMStudio firewall rules found" -ForegroundColor Yellow
}

# Test 4: Check if port is in use locally
Write-Host "`n🔍 Test 4: Local Port Usage" -ForegroundColor Green
$localPorts = Get-NetTCPConnection | Where-Object {$_.LocalPort -eq $LMStudioPort}
if ($localPorts) {
    Write-Host "  ⚠️ Port $LMStudioPort is in use locally:" -ForegroundColor Yellow
    $localPorts | Select-Object LocalAddress, LocalPort, State, OwningProcess | Format-Table -AutoSize
} else {
    Write-Host "  ✅ Port $LMStudioPort is not in use locally" -ForegroundColor Green
}

# Test 5: Advanced port scan
Write-Host "`n🔎 Test 5: Port Scan Results" -ForegroundColor Green
try {
    $nmapOutput = nmap -p $LMStudioPort $LMStudioHost 2>$null | Out-String
    if ($nmapOutput -match "(\d+/tcp\s+\w+)") {
        Write-Host "  Port Status: $($matches[1])" -ForegroundColor $(if($nmapOutput -match "open") {"Green"} else {"Red"})
    }
} catch {
    Write-Host "  ⚠️ nmap not available for advanced scanning" -ForegroundColor Yellow
}

# Test 6: HTTP API Test
Write-Host "`n🌐 Test 6: HTTP API Accessibility" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://$LMStudioHost`:$LMStudioPort/v1/models" -Method GET -TimeoutSec 5
    Write-Host "  ✅ LMStudio API is accessible!" -ForegroundColor Green
    Write-Host "  Models available: $($response.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ LMStudio API not accessible: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Windows Firewall Status
Write-Host "`n🔥 Test 7: Windows Firewall Status" -ForegroundColor Green
$firewallProfiles = Get-NetFirewallProfile
foreach ($profile in $firewallProfiles) {
    $status = if($profile.Enabled) {"Enabled"} else {"Disabled"}
    $color = if($profile.Enabled) {"Yellow"} else {"Green"}
    Write-Host "  $($profile.Name) Profile: $status" -ForegroundColor $color
}

Write-Host "`n📋 Recommended Actions:" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

if (-not $portTest.TcpTestSucceeded) {
    Write-Host "❌ Connection Failed - Try these solutions:"
    Write-Host "  1. Check if LMStudio is running on $LMStudioHost"
    Write-Host "  2. Verify LMStudio is configured to listen on 0.0.0.0:$LMStudioPort (not just localhost)"
    Write-Host "  3. Check Windows Firewall on $LMStudioHost machine"
    Write-Host "  4. Run this command on $LMStudioHost to allow the port:"
    Write-Host "     New-NetFirewallRule -DisplayName 'LMStudio API' -Direction Inbound -Protocol TCP -LocalPort $LMStudioPort -Action Allow"
    Write-Host "  5. Verify your router/network doesn't block internal traffic"
} else {
    Write-Host "✅ Connection successful! LMStudio should be working."
}

Write-Host "`n🚀 Quick Fixes to Run on LMStudio Machine ($LMStudioHost):" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "# Allow LMStudio through Windows Firewall:"
Write-Host "New-NetFirewallRule -DisplayName 'LMStudio Inbound' -Direction Inbound -Protocol TCP -LocalPort $LMStudioPort -Action Allow"
Write-Host "New-NetFirewallRule -DisplayName 'LMStudio Outbound' -Direction Outbound -Protocol TCP -LocalPort $LMStudioPort -Action Allow"
Write-Host ""
Write-Host "# Check if LMStudio process is running:"
Write-Host "Get-Process | Where-Object {`$_.ProcessName -like '*lm*' -or `$_.ProcessName -like '*studio*'}"
Write-Host ""
Write-Host "# Check what's listening on port ${LMStudioPort}:"
Write-Host "Get-NetTCPConnection | Where-Object {`$_.LocalPort -eq ${LMStudioPort}}"

Write-Host "`n✨ Debug complete!" -ForegroundColor Cyan
