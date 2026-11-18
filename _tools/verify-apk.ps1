# 产物校验：签名证书 / 包内页面 hash / 版本号
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$sdk = 'E:\develop\android-sdk'
$bt = Join-Path $sdk 'build-tools\34.0.0'
$apk = Join-Path $root 'TarotApk\app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $apk)) { throw "apk not found: $apk" }

# 中文路径会导致 aapt 打不开，先复制到 ASCII 临时路径
$work = 'C:\Temp\tarot-verify'
New-Item -ItemType Directory -Force -Path $work | Out-Null
$tmp = Join-Path $work ('v-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$tmpApk = Join-Path $tmp 'verify.apk'
Copy-Item -LiteralPath $apk -Destination $tmpApk -Force

Write-Host '== 1) 签名证书 =='
& (Join-Path $bt 'apksigner.bat') verify --print-certs $tmpApk
if ($LASTEXITCODE -ne 0) { throw 'apksigner verify failed' }

Write-Host "`n== 2) 包内页面 hash == 根目录单文件 =="
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($tmpApk)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'assets/index.html' }
if (-not $entry) { $zip.Dispose(); throw 'assets/index.html not in apk' }
$extracted = Join-Path $tmp 'index.html'
$outStream = [System.IO.File]::Create($extracted)
$inStream = $entry.Open()
$inStream.CopyTo($outStream)
$outStream.Close(); $inStream.Close()
$zip.Dispose()
$srcHash = (Get-FileHash -LiteralPath (Join-Path $root 'tarot.html') -Algorithm SHA256).Hash
$pkgHash = (Get-FileHash -LiteralPath $extracted -Algorithm SHA256).Hash
Write-Host ("source : " + $srcHash)
Write-Host ("package: " + $pkgHash)
if ($srcHash -ne $pkgHash) { throw 'HASH MISMATCH' }
Write-Host 'HASH MATCH'

Write-Host "`n== 3) 版本号 =="
& (Join-Path $bt 'aapt.exe') dump badging $tmpApk | Select-String -Pattern "package:|versionName|versionCode|application-label|launchable"
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'ALL CHECKS PASSED'
