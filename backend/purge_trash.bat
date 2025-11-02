@echo off
REM Purge Trash - Delete items older than 30 days
cd /d %~dp0
call venv\Scripts\activate.bat
echo Running trash purge command...
python manage.py purge_trash
pause

