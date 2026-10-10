$ErrorActionPreference = "Stop"

Write-Host "`n========== INTERNMATCH VERIFICATION ==========" -ForegroundColor Cyan

if (-not $env:TEST_DATABASE_URL) {
    Write-Host "STOP: TEST_DATABASE_URL is missing." -ForegroundColor Red
    exit 1
}

if ($env:TEST_DATABASE_URL -match "-pooler") {
    Write-Host "STOP: Use direct Neon test connection." -ForegroundColor Red
    exit 1
}

$confirm = Read-Host "Confirm disposable Neon TEST branch (type TEST)"
if ($confirm -cne "TEST") {
    exit 1
}

Write-Host "`n[1/4] Backend Tests" -ForegroundColor Yellow
& .\.venv\Scripts\python.exe -m pytest backend/tests -q --tb=short
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[2/4] TypeScript" -ForegroundColor Yellow
& npx.cmd tsc --noEmit
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[3/4] Frontend Tests" -ForegroundColor Yellow
& npm.cmd test -- --run
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`n[4/4] Production Build" -ForegroundColor Yellow
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nALL INTERNMATCH CHECKS PASSED!" -ForegroundColor Green
