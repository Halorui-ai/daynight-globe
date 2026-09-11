# Offline static server for Windows PowerShell 5.1. No Node / Python required.
# TcpListener on 127.0.0.1 does not need HTTP.sys URL ACL.
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path -LiteralPath (Join-Path $root "index.html"))) {
  $root = Join-Path (Split-Path -Parent $root) "offline-dist"
}
$log = Join-Path $root "start-error.txt"

function Save-Error([string]$text) {
  try {
    $utf8 = New-Object System.Text.UTF8Encoding $true
    [IO.File]::WriteAllText($log, $text, $utf8)
  } catch {}
  Write-Host $text
}

try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

if (-not (Test-Path -LiteralPath (Join-Path $root "index.html"))) {
  Save-Error "Cannot find index.html. Copy the whole offline-dist folder, then double-click 启动地球.bat inside it."
  exit 1
}

$portStart = 8080
if ($env:PORT) { $portStart = [int]$env:PORT }
$portEnd = $portStart + 10

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
  ".woff2" = "font/woff2"
}

function Open-Globe([string]$url) {
  $candidates = @(
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
  )
  foreach ($exe in $candidates) {
    if ($exe -and (Test-Path -LiteralPath $exe)) {
      Start-Process -FilePath $exe -ArgumentList $url | Out-Null
      return
    }
  }
  Start-Process $url | Out-Null
}

function Resolve-File([string]$rel) {
  if ([string]::IsNullOrWhiteSpace($rel) -or $rel.EndsWith("/")) {
    $rel = "index.html"
  }
  $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
  $rootFull = [IO.Path]::GetFullPath($root)
  if (-not $file.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    return (Join-Path $root "index.html")
  }
  return $file
}

function Write-Http([IO.Stream]$stream, [int]$status, [string]$type, [byte[]]$bytes) {
  $reason = "OK"
  if ($status -eq 403) { $reason = "Forbidden" }
  if ($status -eq 404) { $reason = "Not Found" }
  if (-not $type) { $type = "application/octet-stream" }
  $header = "HTTP/1.0 $status $reason`r`nContent-Type: $type`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
  $headBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headBytes, 0, $headBytes.Length)
  if ($bytes.Length -gt 0) {
    $stream.Write($bytes, 0, $bytes.Length)
  }
  $stream.Flush()
}

function Serve-Client([Net.Sockets.TcpClient]$client) {
  $stream = $client.GetStream()
  $stream.ReadTimeout = 8000
  $buf = New-Object byte[] 16384
  $n = 0
  try { $n = $stream.Read($buf, 0, $buf.Length) } catch { return }
  if ($n -le 0) { return }
  $text = [Text.Encoding]::ASCII.GetString($buf, 0, $n)
  $line = ($text -split "`r`n")[0]
  if ($line -notmatch '^(GET|HEAD)\s+(\S+)') {
    Write-Http $stream 404 "text/plain" ([Text.Encoding]::UTF8.GetBytes("not found"))
    return
  }
  $rawPath = $Matches[2]
  $q = $rawPath.IndexOf("?")
  if ($q -ge 0) { $rawPath = $rawPath.Substring(0, $q) }
  $rel = [Uri]::UnescapeDataString($rawPath.TrimStart("/"))
  $file = Resolve-File $rel
  if (-not $file) {
    Write-Http $stream 403 "text/plain" ([Text.Encoding]::UTF8.GetBytes("forbidden"))
    return
  }
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    Write-Http $stream 404 "text/plain" ([Text.Encoding]::UTF8.GetBytes("not found"))
    return
  }
  $bytes = [IO.File]::ReadAllBytes($file)
  $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
  $type = $mime[$ext]
  Write-Http $stream 200 $type $bytes
}

function Start-TcpLoop([int]$port) {
  $ip = [System.Net.IPAddress]::Loopback
  $listener = New-Object -TypeName System.Net.Sockets.TcpListener -ArgumentList @($ip, $port)
  $listener.Start()
  $url = "http://127.0.0.1:$port/"
  Write-Host "Globe offline  $url"
  Write-Host "Opened in Edge/Chrome. Close this window to stop."
  Write-Host "Do not double-click index.html."
  if (Test-Path -LiteralPath $log) {
    Remove-Item -LiteralPath $log -Force -ErrorAction SilentlyContinue
  }
  try {
    Open-Globe $url
  } catch {
    Write-Host "Could not auto-open the browser. Open this URL manually:"
    Write-Host "  $url"
  }
  try {
    while ($true) {
      $client = $listener.AcceptTcpClient()
      try { Serve-Client $client } catch {}
      try { $client.Close() } catch {}
    }
  } finally {
    try { $listener.Stop() } catch {}
  }
}

$last = $null
$started = $false
foreach ($port in $portStart..$portEnd) {
  try {
    Start-TcpLoop $port
    $started = $true
    break
  } catch {
    $last = $_
    continue
  }
}

if (-not $started) {
  $detail = "Cannot listen on 127.0.0.1:$portStart. Last error:`r`n$last"
  Save-Error $detail
  exit 1
}
