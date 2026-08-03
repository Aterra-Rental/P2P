@echo off
setlocal

title P2P Secure Transaction Platform Launcher

set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%Backend\myproject\p2p_deal_app"
set "FRONTEND_DIR=%PROJECT_ROOT%Frontend"
set "PYTHON_COMMAND=python"

if exist "%PROJECT_ROOT%.venv\Scripts\python.exe" (
    set "PYTHON_COMMAND=%PROJECT_ROOT%.venv\Scripts\python.exe"
)

if not exist "%BACKEND_DIR%\app.py" (
    echo ERROR: Backend app.py was not found:
    echo %BACKEND_DIR%\app.py
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo ERROR: Frontend package.json was not found:
    echo %FRONTEND_DIR%\package.json
    pause
    exit /b 1
)

echo Starting Flask and Socket.IO backend...
start "P2P - Backend" cmd /k ^
  "cd /d ""%BACKEND_DIR%"" && ""%PYTHON_COMMAND%"" app.py"

echo Starting Vite frontend...
start "P2P - Frontend" cmd /k ^
  "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo Waiting for services to initialize...
timeout /t 4 /nobreak >nul

echo Opening the application...
start "" "http://localhost:5173/"

echo P2P development services launched.
endlocal