Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$public = Join-Path $root 'public'
New-Item -ItemType Directory -Force -Path $public | Out-Null

function New-MomentumIcon {
  param(
    [Parameter(Mandatory)] [int]$Size,
    [double]$ContentScale = 1.0
  )

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  # Dark slate background, full bleed.
  $g.Clear([System.Drawing.Color]::FromArgb(255, 2, 6, 23))

  # Coral -> amber -> teal diagonal gradient.
  $gradientRect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $gradientRect,
    [System.Drawing.Color]::FromArgb(255, 251, 113, 133),
    [System.Drawing.Color]::FromArgb(255, 45, 212, 191),
    35.0)
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend
  $blend.Colors = [System.Drawing.Color[]]@(
    [System.Drawing.Color]::FromArgb(255, 251, 113, 133),
    [System.Drawing.Color]::FromArgb(255, 251, 191, 36),
    [System.Drawing.Color]::FromArgb(255, 45, 212, 191)
  )
  $blend.Positions = [float[]]@(0.0, 0.55, 1.0)
  $brush.InterpolationColors = $blend

  # Lucide "trending-up" geometry on a 24-unit grid, scaled into the canvas.
  $unit = ($Size * 0.6875) / 24.0 * $ContentScale   # 24-unit grid at ~69% of canvas
  $offset = $Size / 2.0 - 12.0 * $unit
  $scalePoint = {
    param($x, $y)
    New-Object System.Drawing.PointF(
      [float]($offset + $x * $unit),
      [float]($offset + $y * $unit))
  }

  $strokeWidth = [float](2.0 * $unit)
  $pen = New-Object System.Drawing.Pen($brush, $strokeWidth)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $polyline = [System.Drawing.PointF[]]@(
    & $scalePoint 22 7
    & $scalePoint 13.5 15.5
    & $scalePoint 8.5 10.5
    & $scalePoint 2 17
  )
  $g.DrawLines($pen, $polyline)

  $arrowhead = [System.Drawing.PointF[]]@(
    & $scalePoint 16 7
    & $scalePoint 22 7
    & $scalePoint 22 13
  )
  $g.DrawLines($pen, $arrowhead)

  $g.Dispose()
  return $bmp
}

$targets = @(
  @{ Name = 'icon-512.png'; Size = 512; ContentScale = 1.0 },
  @{ Name = 'icon-192.png'; Size = 192; ContentScale = 1.0 },
  @{ Name = 'apple-touch-icon.png'; Size = 180; ContentScale = 1.0 },
  @{ Name = 'favicon.png'; Size = 64; ContentScale = 1.0 },
  @{ Name = 'maskable-512.png'; Size = 512; ContentScale = 0.66 }  # keep inside the 80% safe zone
)

foreach ($target in $targets) {
  $bitmap = New-MomentumIcon -Size $target.Size -ContentScale $target.ContentScale
  $path = Join-Path $public $target.Name
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  Write-Host "wrote $path"
}
