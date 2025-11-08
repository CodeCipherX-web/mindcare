@echo off
echo ========================================
echo Starting MindCare Server
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Checking Node.js version...
node --version
echo.

REM Check if we're in the right directory
if not exist "server.js" (
    echo ERROR: server.js not found!
    echo Please make sure you're in the mental-health-platform folder
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo WARNING: node_modules folder not found!
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please create a .env file with your configuration
    echo See .env.example for reference
    echo.
)

echo Starting server on port 3000...
echo.
echo ========================================
echo Server will be available at:
echo http://localhost:3000
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js

pause

