@echo off
cd /d "%~dp0"
echo.
echo  Day/Night Globe - offline
echo  Keep this window open. Close it to stop.
echo  Do not double-click index.html (the globe will be black).
echo.

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" set "PS=powershell.exe"

"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
set "ERR=%ERRORLEVEL%"

echo.
if not "%ERR%"=="0" (
  echo  START FAILED. Read start-error.txt in this folder.
)
pause
exit /b %ERR%
