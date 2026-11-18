$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe" }
$shots = Join-Path $root 'tests\shots'
New-Item -ItemType Directory -Force -Path $shots | Out-Null

function Shot([string]$name, [string]$pageQuery, [int]$w, [int]$h) {
  $url = 'file:///' + ($root -replace '\\','/') + '/tarot.html' + $pageQuery
  $dest = Join-Path $shots ($name + '.png')
  & $chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars --window-size="$w,$h" --virtual-time-budget=9000 --screenshot="$dest" $url
  if (Test-Path $dest) { Write-Host ("shot {0,-14} {1} bytes" -f $name, (Get-Item $dest).Length) } else { Write-Host "FAIL $name" }
}

Shot 'home'    ''                 390 844
Shot 'today'   '?page=today'      390 844
Shot 'glossary' '?page=glossary'  390 844
Shot 'detail'  '?page=detail&card=m00' 390 844
Shot 'me'      '?page=me'         390 844
Shot 's1'      '?page=glossary'   320 700
Shot 's2'      '?page=today'      768 900
