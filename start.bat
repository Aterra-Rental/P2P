@echo off
start "Flask - Deal Tracker" cmd /k "cd p2p_deal_app && python app.py"
start "Django - Backend" cmd /k "cd Backend\myproject && python manage.py runserver"
start "Vite - Frontend" cmd /k "cd Frontend && npm run dev"
timeout /t 3 /nobreak
start http://localhost:5173/Login // where it starts the frontend app


// cd P2P\p2p_deal_app             python app.py
// cd P2P\Frontend                   npm run dev
// cd P2P\Backend\myproject     python manage.py runserver