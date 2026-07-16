@echo off
cd /d "%~dp0"
start "LuxTranslator Server" cmd /k "node server.js"
timeout /t 3 /nobreak > nul
start "LuxTranslator Ngrok" cmd /k "ngrok http 3000"
timeout /t 4 /nobreak > nul
start chrome "http://127.0.0.1:4040"
pause
