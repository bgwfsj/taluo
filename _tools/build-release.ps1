# 一键 release 构建：同步 assets → Gradle assembleRelease（正式签名）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 1) 同步单文件到安卓 assets
Copy-Item -LiteralPath (Join-Path $root 'tarot.html') -Destination (Join-Path $root 'TarotApk\app\src\main\assets\index.html') -Force
Write-Host '[sync] assets/index.html <- tarot.html'

# 2) 环境
$env:JAVA_HOME = 'E:\develop\jdk\jdk-17'
$env:ANDROID_HOME = 'E:\develop\android-sdk'
$env:ANDROID_SDK_ROOT = 'E:\develop\android-sdk'
$env:GRADLE_USER_HOME = "$env:USERPROFILE\.gradle"
$env:TMP = 'C:\Temp\gradle-tmp'
New-Item -ItemType Directory -Force -Path $env:TMP | Out-Null

$gradle = Join-Path $env:USERPROFILE 'Android\gradle\gradle-8.5\bin\gradle.bat'
if (-not (Test-Path $gradle)) { throw "gradle not found: $gradle" }
Write-Host "[gradle] $gradle"
& $gradle -p (Join-Path $root 'TarotApk') assembleRelease
if ($LASTEXITCODE -ne 0) { throw 'gradle build failed' }
Write-Host '[ok] assembleRelease done'
