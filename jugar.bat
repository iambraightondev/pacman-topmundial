@echo off
cd /d "%~dp0"
start "" http://localhost:8264/index.html
python -m http.server 8264 2>nul
