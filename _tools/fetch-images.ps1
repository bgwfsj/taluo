$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'tests\images'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$r = Get-Content (Join-Path $root 'tests\imageinfo.json') -Raw | ConvertFrom-Json
$infoByTitle = @{}
foreach ($p in $r.query.pages.PSObject.Properties) {
  if ($p.Value.imageinfo) { $infoByTitle[$p.Value.title] = $p.Value.imageinfo[0] }
}

$rankMap = @{ '01'='ace'; '02'='2'; '03'='3'; '04'='4'; '05'='5'; '06'='6'; '07'='7'; '08'='8'; '09'='9'; '10'='10'; '11'='page'; '12'='knight'; '13'='queen'; '14'='king' }
$suitMap = @{ 'Cups'='c'; 'Pentacles'='p'; 'Swords'='s'; 'Wands'='w' }

function Get-IdFromTitle([string]$title) {
  $base = $title -replace '^File:',''
  if ($base -match '^RWS1909 - (\d{2}) .*\.jpeg$') { return 'm' + $Matches[1] }
  if ($base -match '^RWS1909 - (Cups|Pentacles|Swords|Wands) (\d{2})\.jpeg$') {
    return ($suitMap[$Matches[1]]) + '-' + $rankMap[$Matches[2]]
  }
  if ($base -match 'Roses and Lilies cropped') { return 'back-cropped' }
  if ($base -match 'Roses and Lilies') { return 'back' }
  throw "No mapping for: $base"
}

# 确定性顺序：大牌 22 + 四花色各 14 + 2 张牌背
$titles = @()
for ($i = 0; $i -lt 22; $i++) {
  $titles += ('File:RWS1909 - {0:D2} X.jpeg' -f $i) -replace ' X\.jpeg', (' - ' + (Get-Culture))  # placeholder replaced below
}
# 上面的占位写法太绕，直接重建：
$titles = @()
foreach ($m in 0..21) { $titles += "File:RWS1909 - {0:D2} Placeholder.jpeg" -f $m }
$majorNames = @('Fool','Magician','High Priestess','Empress','Emperor','Hierophant','Lovers','Chariot','Strength','Hermit','Wheel of Fortune','Justice','Hanged Man','Death','Temperance','Devil','Tower','Star','Moon','Sun','Judgement','World')
$titles = @()
for ($i = 0; $i -lt 22; $i++) { $titles += ("File:RWS1909 - {0:D2} {1}.jpeg" -f $i, $majorNames[$i]) }
foreach ($suit in @('Cups','Pentacles','Swords','Wands')) {
  for ($i = 1; $i -le 14; $i++) { $titles += ("File:RWS1909 - {0} {1:D2}.jpeg" -f $suit, $i) }
}
$titles += 'File:Waite–Smith Tarot Roses and Lilies cropped.jpg'
$titles += 'File:Waite–Smith Tarot Roses and Lilies.jpg'

$ok = 0; $fail = 0
foreach ($title in $titles) {
  $id = Get-IdFromTitle $title
  $dest = Join-Path $out ($id + '.jpg')
  if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 1000) { Write-Host "SKIP $id"; $ok++; continue }
  $url = $null
  if ($infoByTitle.ContainsKey($title)) { $url = ($infoByTitle[$title].thumburl -split '\?')[0] }
  if (-not $url) {
    $enc = [uri]::EscapeDataString($title)
    $u = "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&titles=$enc"
    $tmp = Join-Path $env:TEMP ('ii_' + [guid]::NewGuid().ToString('N') + '.json')
    curl.exe -s --max-time 30 $u -o $tmp
    if (Test-Path $tmp) {
      try { $j = Get-Content $tmp -Raw | ConvertFrom-Json } catch { $j = $null }
      Remove-Item $tmp -Force -ErrorAction SilentlyContinue
      if ($j) {
        foreach ($p in $j.query.pages.PSObject.Properties) {
          if ($p.Value.imageinfo) { $url = ($p.Value.imageinfo[0].thumburl -split '\?')[0]; break }
        }
      }
    }
    Start-Sleep -Milliseconds 800
  }
  if (-not $url) { Write-Host "NO URL $id"; $fail++; continue }
  $attempt = 0; $done = $false
  while ($attempt -lt 4 -and -not $done) {
    $attempt++
    curl.exe -s --max-time 45 $url -o $dest
    if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 1000) {
      Write-Host ("OK   {0,-14} {1,8} bytes (attempt {2})" -f $id, (Get-Item $dest).Length, $attempt)
      $done = $true; $ok++
    } else { Start-Sleep -Milliseconds 1500 }
  }
  if (-not $done) { Write-Host "FAIL $id"; $fail++ }
  Start-Sleep -Milliseconds 400
}
Write-Host ("`nDone: ok={0}, fail={1}, files={2}, total size {3:N1} MB" -f $ok, $fail, (Get-ChildItem $out -File).Count, ((Get-ChildItem $out -File | Measure-Object Length -Sum).Sum/1MB))

