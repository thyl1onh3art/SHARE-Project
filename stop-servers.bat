@echo off
echo ========================================
echo    SHARE Project - Stopping Servers
echo ========================================
echo.

echo Stopping all Node.js processes...
taskkill /f /im node.exe > nul 2>&1

echo.
echo All servers have been stopped.
echo.
echo Press any key to close this window...
pause > nul


