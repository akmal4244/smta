$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
$healthUrl = "http://127.0.0.1:8788/api/health"

try {
  $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
  if ($response.StatusCode -eq 200) {
    Write-Output "SMTA AI server already running at $healthUrl"
    exit 0
  }
} catch {
  # Server is not running yet.
}

Start-Process `
  -FilePath "node" `
  -ArgumentList @("ai-server.mjs", "8788") `
  -WorkingDirectory $repo `
  -WindowStyle Hidden

Start-Sleep -Seconds 2

try {
  $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
  Write-Output "SMTA AI server started: $($response.StatusCode)"
} catch {
  Write-Output "SMTA AI server start requested, but health check is not ready yet."
}
