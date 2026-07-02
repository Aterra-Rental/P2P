@echo off
start "Flask - Deal Tracker" cmd /k "cd p2p_deal_app && python app.py"
start "Django - Backend" cmd /k "cd Backend\myproject && python manage.py runserver"
start "Vite - Frontend" cmd /k "cd Frontend && npm run dev"
timeout /t 3 /nobreak

start http://localhost:5173/Login
start http://localhost:5173/Login
start http://127.0.0.1:8000/admin/


// cd P2P\p2p_deal_app             python app.py
// cd P2P\Frontend                   npm run dev
// cd P2P\Backend\myproject     python manage.py runserver

// cd "Backend\myproject" 

// username : nang 
// ps : 87654321





// nak 12345678












// Username: admin
// Email: admin@test.com
// Password: admin1234




// username : admin 
// ps : 12345678

