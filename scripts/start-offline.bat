@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  昼夜地球 离线版
echo  打开浏览器访问 http://127.0.0.1:8080
echo  按 Ctrl+C 结束
echo.

where py >nul 2>&1
if %errorlevel%==0 (
  start "" http://127.0.0.1:8080
  py -m http.server 8080 --bind 127.0.0.1
  goto :eof
)

where python >nul 2>&1
if %errorlevel%==0 (
  start "" http://127.0.0.1:8080
  python -m http.server 8080 --bind 127.0.0.1
  goto :eof
)

where node >nul 2>&1
if %errorlevel%==0 (
  start "" http://127.0.0.1:8080
  node serve.mjs
  goto :eof
)

echo 这台电脑需要安装 Python 3 或 Node.js（安装时不需要联网，用安装包即可）。
echo 装好后重新双击本文件。
pause
