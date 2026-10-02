#Requires Administrative privileges in PowerShell
$ErrorActionPreference = 'Stop'

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "       GATE MONITOR WINDOWS HOST SETUP                   " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Verify WSL2 is installed
Write-Host "[1/6] Checking WSL2 status..."
$wslStatus = wsl --status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] WSL2 is not installed or configured correctly." -ForegroundColor Red
    Write-Host $wslStatus
    exit 1
}
Write-Host "[OK] WSL2 is installed." -ForegroundColor Green

# 2. Verify Ubuntu 22.04 distro
Write-Host "[2/6] Checking installed WSL distributions..."
$distros = wsl -l -v
Write-Host $distros
if ($distros -match "Ubuntu-22.04") {
    Write-Host "[OK] Ubuntu-22.04 found." -ForegroundColor Green
} else {
    Write-Host "[WARNING] Ubuntu-22.04 not explicitly detected in default list. Ensure your default distro is Ubuntu 22.04." -ForegroundColor Yellow
}

# 3. Docker Desktop WSL Integration instructions
Write-Host "[3/6] Docker Desktop WSL2 integration reminder:" -ForegroundColor Yellow
Write-Host "  Please open Docker Desktop -> Settings -> Resources -> WSL Integration"
Write-Host "  and ensure integration is enabled for your Ubuntu 22.04 distribution."

# 4. Power policy (never sleep when plugged in)
Write-Host "[4/6] Configuring Windows power policy (never sleep on AC)..."
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 15
Write-Host "[OK] Standby timeout set to 0 (never sleep on AC)." -ForegroundColor Green

# 5. Windows Update active hours notice
Write-Host "[5/6] Windows Update active hours notice:" -ForegroundColor Yellow
Write-Host "  Please configure Active Hours in Windows Settings -> Windows Update"
Write-Host "  to prevent unexpected mid-day reboots during production hours."

# 6. Windows Firewall rule
Write-Host "[6/6] Adding Windows Firewall rule to block inbound dev ports..."
$ruleName = "Block gate-monitor dev ports"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($null -eq $existingRule) {
    New-NetFirewallRule -DisplayName $ruleName `
        -Direction Inbound -LocalPort 3000,5432,6379 -Protocol TCP -Action Block | Out-Null
    Write-Host "[OK] Firewall rule created blocking inbound TCP ports 3000, 5432, 6379." -ForegroundColor Green
} else {
    Write-Host "[OK] Firewall rule already exists." -ForegroundColor Green
}

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "Windows host setup completed successfully!" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
