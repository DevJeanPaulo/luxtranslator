@echo off
cd /d "%~dp0"
start "LuxTranslator" cmd /k "node server.js"
timeout /t 2 /nobreak > nul
start chrome "http://localhost:3000"
