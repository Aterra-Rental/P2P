@echo off
title P2P Secure Transaction Platform Launcher

echo Starting P2P Python Backend...
start "P2P - Backend" cmd /k "cd /d C:\Users\USER\Documents\GitHub\P2P\Backend\myproject\p2p_deal_app && python app.py"

echo Starting P2P Vite Frontend...
start "P2P - Frontend" cmd /k "cd /d C:\Users\USER\Documents\GitHub\P2P\Frontend && npm run dev"

echo Waiting for services to initialize...
timeout /t 4 /nobreak >nul

@REM echo Opening browser tabs...
@REM start http://localhost:5173/
@REM start http://localhost:5173/Login

echo Opening browser tabs in Chrome...
start chrome http://localhost:5173/
start chrome http://localhost:5173/Login

echo All services launched successfully!










// gmail : ps :    aabbcc@gmail.com aabbcc









