@echo off
echo ========================================
echo    SHARE Project - Starting Servers
echo ========================================
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d "C:\Users\rabro\OneDrive\Projects\SHARE Project\backend" && $env:JWT_SECRET="your_super_secret_jwt_key_here_make_it_long_and_secure_12345"; $env:MONGODB_URI="mongodb://localhost:27017/share_project"; $env:PORT="5000"; $env:NODE_ENV="development"; node app.js"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d "C:\Users\rabro\OneDrive\Projects\SHARE Project\frontend" && npm start"

echo.
echo ========================================
echo    Servers are starting up...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo The servers will open in separate windows.
echo Close those windows to stop the servers.
echo.
echo Press any key to close this window...
pause > nul


