@echo off
start "Flask - Deal Tracker" cmd /k "cd p2p_deal_app && python app.py"
start "Vite - Frontend" cmd /k "cd Frontend && npm run dev"