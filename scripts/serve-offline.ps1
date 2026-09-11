# Windows built-in static server. No Python / Node required.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path -LiteralPath (Join-Path $root "index.html"))) {
  $root = Split-Path -Parent $root
  $root = Join-Path $root "offline-dist"
}
$port = 8080
if ($env:PORT) { $port = [int]$env:PORT }
$prefix = "http://127.0.0.1:$port/"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".mjs"  = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".webp" = "image/webp"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Host "无法占用 8080，改为直接打开网页。"
  Start-Process (Join-Path $root "index.html")
  exit 0
}

Start-Process $prefix
Write-Host "昼夜地球（离线） $prefix"
Write-Host "关闭此窗口即停止。"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($rel) -or $rel.EndsWith("/")) {
    $rel = "index.html"
  }
  $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
  $rootFull = [IO.Path]::GetFullPath($root)
  if (-not $file.StartsWith($rootFull)) {
    $ctx.Response.StatusCode = 403
    $ctx.Response.Close()
    continue
  }
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    $file = Join-Path $root "index.html"
  }
  $bytes = [IO.File]::ReadAllBytes($file)
  $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
  $type = $mime[$ext]
  if (-not $type) { $type = "application/octet-stream" }
  $ctx.Response.ContentType = $type
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.Close()
}
