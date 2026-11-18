# 生成圣杯国王启动图标（512 底图 + 各密度 mipmap）
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$imgPath = Join-Path $root 'tests\images-opt\c-king.jpg'
$resDir = Join-Path $root 'TarotApk\app\src\main\res'
$card = [System.Drawing.Image]::FromFile($imgPath)

function New-RoundedPath($x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $r1 = [System.Drawing.RectangleF]::new([single]$x, [single]$y, [single]$d, [single]$d)
  $r2 = [System.Drawing.RectangleF]::new([single]($x + $w - $d), [single]$y, [single]$d, [single]$d)
  $r3 = [System.Drawing.RectangleF]::new([single]($x + $w - $d), [single]($y + $h - $d), [single]$d, [single]$d)
  $r4 = [System.Drawing.RectangleF]::new([single]$x, [single]($y + $h - $d), [single]$d, [single]$d)
  $path.AddArc($r1, 180, 90)
  $path.AddArc($r2, 270, 90)
  $path.AddArc($r3, 0, 90)
  $path.AddArc($r4, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Icon($size, $outPath) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $rect = [System.Drawing.RectangleF]::new([single]0, [single]0, [single]$size, [single]$size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,
    [System.Drawing.Color]::FromArgb(255, 232, 246, 240),
    [System.Drawing.Color]::FromArgb(255, 226, 238, 250), 90)
  $g.FillRectangle($brush, $rect)
  # 只取上半身（裁剪窗口 top=55, h=195），比例接近 1.54:1
  $cropTop = 55
  $cropH = 195
  $cw = [int]($size * 0.64)
  $ch = [int]($cw * $cropH / $card.Width)
  $cx = [int](($size - $cw) / 2)
  $cy = [int](($size - $ch) / 2) + [int]($size * 0.01)
  $radius = [int]($size * 0.045)
  $sh = New-RoundedPath $cx ($cy + [int]($size * 0.012)) $cw $ch $radius
  $sb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 30, 60, 50))
  $g.FillPath($sb, $sh)
  $clip = New-RoundedPath $cx $cy $cw $ch $radius
  $g.SetClip($clip)
  $srcRect = [System.Drawing.Rectangle]::new(0, $cropTop, $card.Width, $cropH)
  $dstRect = [System.Drawing.Rectangle]::new($cx, $cy, $cw, $ch)
  $g.DrawImage($card, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.ResetClip()
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 255, 255, 255), [float]($size * 0.006))
  $g.DrawPath($pen, $clip)
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $brush.Dispose(); $sb.Dispose(); $pen.Dispose(); $clip.Dispose(); $sh.Dispose()
}

$sizes = @{ 'mipmap-mdpi' = 48; 'mipmap-hdpi' = 72; 'mipmap-xhdpi' = 96; 'mipmap-xxhdpi' = 144; 'mipmap-xxxhdpi' = 192 }
foreach ($k in $sizes.Keys) {
  $dir = Join-Path $resDir $k
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  New-Icon $sizes[$k] (Join-Path $dir 'ic_launcher.png')
  New-Icon $sizes[$k] (Join-Path $dir 'ic_launcher_round.png')
  Write-Host ("icon {0} {1}px" -f $k, $sizes[$k])
}
$card.Dispose()
Write-Host 'done'
