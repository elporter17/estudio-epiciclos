# Copia al portapapeles, uno por uno, los secretos que necesita .github/workflows/daily.yml.
# No imprime ningun valor: tu lo pegas en GitHub > Settings > Secrets and variables > Actions > New repository secret.
#   powershell -ExecutionPolicy Bypass -File scripts/secrets-to-clipboard.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/secrets-to-clipboard.ps1 TIKTOK_TOKEN_SEED STATE_KEY   (solo esos)
$only = $args
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
$tokenFile = Join-Path $root 'data\tiktok-token.json'
if (-not (Test-Path $envFile)) { throw "Falta ${envFile}" }
if (-not (Test-Path $tokenFile)) { throw "Falta ${tokenFile}: ejecuta primero 'npm.cmd run tiktok:connect'" }

$vars = @{}
foreach ($line in Get-Content $envFile -Encoding UTF8) {
  if ($line -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') { $vars[$Matches[1]] = $Matches[2] }
}
$vars['TIKTOK_TOKEN_SEED'] = (Get-Content $tokenFile -Raw -Encoding UTF8).Trim()

$names = 'OPEN_AI', 'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI', 'TIKTOK_TOKEN_SEED', 'STATE_KEY'
if ($only) { $names = $names | Where-Object { $only -contains $_ } }
$missing = $names | Where-Object { -not $vars[$_] }
if ($missing) { throw "Sin valor en .env: $($missing -join ', ')" }

Write-Host "Abre https://github.com/elporter17/estudio-epiciclos/settings/secrets/actions/new`n"
foreach ($n in $names) {
  Set-Clipboard -Value $vars[$n]
  Write-Host "`n[$n] ya esta en el portapapeles."
  Write-Host "  1. En GitHub > New repository secret: Name = $n"
  Write-Host "  2. Haz clic en el cuadro 'Secret', pega con Ctrl+V y pulsa 'Add secret'"
  [void](Read-Host "  3. Vuelve aqui y presiona SOLO Enter (no pegues nada aqui)")
}
Set-Clipboard -Value ' '
Write-Host "`nListo: $($names.Count) secreto(s). Portapapeles limpio."
