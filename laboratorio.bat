@echo off
rem EL LABORATORIO: el juego en local, aislado de produccion, con el panel de
rem trucos. Ver laboratorio\servidor.js. Cierra esta ventana para apagarlo.
cd /d "%~dp0"
title PAC-MAN TOP MUNDIAL - LABORATORIO
start "" http://localhost:8265/?red=local
node laboratorio\servidor.js
pause
