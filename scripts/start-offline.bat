@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  昼夜地球 · 离线版（不需要安装任何软件）
echo.

REM 1) Windows 自带 PowerShell 起本地网页（最稳）
where powershell >nul 2>&1
if %errorlevel%==0 (
  echo  正在打开 http://127.0.0.1:8080
  echo  关闭本窗口即停止
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
  goto :eof
)

REM 2) 没有 PowerShell 时直接用浏览器打开（Chrome / Edge）
echo  改为直接打开网页文件
start "" "%~dp0index.html"
echo  若地球是黑的，请用 Chrome 或 Edge 打开本文件夹里的 index.html
pause
