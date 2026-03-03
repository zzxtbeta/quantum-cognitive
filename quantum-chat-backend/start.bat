@echo off
chcp 65001 > nul
echo.
echo  ─────────────────────────────────────
echo   Quantum Chat Backend  ^|  port 8001
echo  ─────────────────────────────────────
echo.
cd /d "%~dp0"
D:\Software\Anaconda\envs\cyber\python.exe main.py
