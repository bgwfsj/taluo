$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $root 'tests\images'
$outDir = Join-Path $root 'tests\images-opt'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.Drawing
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)

$total = 0
Get-ChildItem $srcDir -File -Filter *.jpg | Sort-Object Name | ForEach-Object {
  $src = [System.Drawing.Image]::FromFile($_.FullName)
  try {
    $targetW = 300
    if ($_.BaseName -like 'back*') { $targetW = 360 }
    $w = $targetW
    $h = [int][math]::Round($src.Height * $w / $src.Width)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($src, 0, 0, $w, $h)
    $dest = Join-Path $outDir ($_.BaseName + '.jpg')
    $bmp.Save($dest, $enc, $ep)
    $sz = (Get-Item $dest).Length
    $total += $sz
    Write-Host ("{0,-14} {1,8} bytes" -f $_.BaseName, $sz)
    $g.Dispose(); $bmp.Dispose()
  } finally {
    $src.Dispose()
  }
}
Write-Host ("`nOptimized {0} files, total {1:N2} MB" -f (Get-ChildItem $outDir -File).Count, ($total/1MB))
