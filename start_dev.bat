@echo off
echo Starting ProdActivity Development Servers...
echo.

echo Starting Django Backend Server...
cd backend
start "Django Backend" cmd /k "venv\Scripts\Activate && python manage.py runserver"

echo.
echo Starting React Frontend Server...
cd ..\frontend
start "React Frontend" cmd /k "npm start"

echo.
echo Servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul
