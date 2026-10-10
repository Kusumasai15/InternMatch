param()
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$logDir = Join-Path $PSScriptRoot '.local-logs'
$startedProcesses = @()
function Get-LocalStatus([string]$url) {
    $request = [System.Net.HttpWebRequest]::Create($url)
    $request.Proxy = $null
    $request.Timeout = 2000
    $response = $request.GetResponse()
    try { return [int]$response.StatusCode } finally { $response.Close() }
}
try {
    if (!(Test-Path -LiteralPath $pythonExe)) { throw 'Missing .venv. Run py -3.12 -m venv .venv and install backend/requirements-dev.txt. See README.md.' }
    & $pythonExe -c "import sys; assert sys.version_info[:2] == (3, 12), 'Use Python 3.12'; import fastapi, uvicorn, networkx, pydantic, dotenv, psycopg"
    if ($LASTEXITCODE -ne 0) { throw 'Python version or backend dependencies are invalid. See README.md setup.' }
    $nodeExe = (Get-Command node -ErrorAction Stop).Source
    & $nodeExe -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major<22 || (major===22 && minor<12)) process.exit(1)"
    if ($LASTEXITCODE -ne 0) { throw 'Node.js 22.12 or newer is required (Node 24 is supported).' }
    $viteEntry = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'
    if (!(Test-Path -LiteralPath $viteEntry)) { throw 'Frontend dependencies are missing. Run npm install once.' }
    foreach ($port in @(3000, 8000)) {
        $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
        try { $probe.Start() } catch { throw "Port $port is already in use. Stop its server before starting InternMatch." } finally { $probe.Stop() }
    }
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $backendProcess = Start-Process -FilePath $pythonExe -ArgumentList @('-m','uvicorn','backend.app.main:app','--host','127.0.0.1','--port','8000') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput "$logDir\backend.log" -RedirectStandardError "$logDir\backend-error.log"
    $startedProcesses += $backendProcess
    $frontendProcess = Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $viteEntry + '"')) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput "$logDir\frontend.log" -RedirectStandardError "$logDir\frontend-error.log"
    $startedProcesses += $frontendProcess
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        foreach ($process in $startedProcesses) { if ($process.HasExited) { throw "Server exited early. Read logs in $logDir." } }
        try {
            $health = Get-LocalStatus 'http://127.0.0.1:8000/api/health'
            $page = Get-LocalStatus 'http://127.0.0.1:3000'
            if ($health -eq 200 -and $page -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (!$ready) { throw "Servers did not become ready. Read logs in $logDir." }
    Write-Host 'Frontend: http://localhost:3000'
    Write-Host 'Backend:  http://localhost:8000'
    Write-Host 'API docs: http://localhost:8000/docs'
    Write-Host "Logs: $logDir"
    Write-Host 'Keep this terminal open. Press Ctrl+C to stop both servers.'
    while ($true) {
        foreach ($process in $startedProcesses) { if ($process.HasExited) { throw "Server stopped unexpectedly. Read logs in $logDir." } }
        Start-Sleep -Seconds 1
    }
} finally {
    foreach ($process in $startedProcesses) { if (!$process.HasExited) { Stop-Process -Id $process.Id -ErrorAction SilentlyContinue } }
}
