@echo off
setlocal EnableExtensions

title P2P Secure Transaction Platform Launcher

set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%Backend\myproject\p2p_deal_app"
set "FRONTEND_DIR=%PROJECT_ROOT%Frontend"

REM Use virtual environment if available
if exist "%PROJECT_ROOT%.venv\Scripts\python.exe" (
    set "PYTHON=%PROJECT_ROOT%.venv\Scripts\python.exe"
) else (
    set "PYTHON=python"
)

if not exist "%BACKEND_DIR%\app.py" (
    echo ERROR: app.py not found:
    echo %BACKEND_DIR%\app.py
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo ERROR: package.json not found:
    echo %FRONTEND_DIR%\package.json
    pause
    exit /b 1
)

echo Starting Backend...
start "P2P - Backend" cmd /k "cd /d "%BACKEND_DIR%" && %PYTHON% app.py || (echo. & echo =============================== & echo Backend crashed. Press any key... & pause)"

echo Starting Frontend...
start "P2P - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

timeout /t 3 /nobreak >nul

start chrome "http://localhost:5173/"

echo.
echo Backend : http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
echo Launcher finished.
pause
endlocal