# One-click verify: build + syntax check + headless regression
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "== 1/3 build =="
node _tools\build.js
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "`n== 2/3 JS syntax check =="
node -e "const fs=require('fs');const h=fs.readFileSync('tarot.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/);fs.writeFileSync('_tools/_check.js',m[1]);"
node --check _tools\_check.js
if ($LASTEXITCODE -ne 0) { Remove-Item _tools\_check.js -Force; throw "JS syntax error" }
Remove-Item _tools\_check.js -Force
Write-Host "JS syntax OK"

Write-Host "`n== 3/3 headless regression (Chrome) =="
$chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $chrome)) { throw "Chrome not found" }
$url = "file:///" + (($root -replace '\\','/') -replace ' ','%20') + "/tarot.html?selftest"
$ErrorActionPreference = 'Continue'
& $chrome --headless=new --disable-gpu --no-sandbox --virtual-time-budget=8000 --dump-dom $url 2>&1 | Out-File -FilePath "tests\selftest-dump.html" -Encoding UTF8
$ErrorActionPreference = 'Stop'
$content = Get-Content "tests\selftest-dump.html" -Raw
$m = [regex]::Match($content, '<div id="selftest" data-result="([A-Z]+)" data-count="(\d+)">([\s\S]*?)</div>')
if (-not $m.Success) { throw "selftest result not found; page may have failed" }
Write-Host ("selftest: {0} ({1} items)" -f $m.Groups[1].Value, $m.Groups[2].Value)
if ($m.Groups[1].Value -ne 'PASS') { Write-Host $m.Groups[3].Value; throw "regression NOT passed" }
Write-Host "ALL PASSED OK"
