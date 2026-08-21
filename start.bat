@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PY=
where py >nul 2>&1 && set PY=py
if "%PY%"=="" (where python >nul 2>&1 && set PY=python)
if "%PY%"=="" (where python3 >nul 2>&1 && set PY=python3)
if "%PY%"=="" (echo Python が見つかりませんでした。 & pause & exit /b 1)
echo http://localhost:8000/ を開きます。このウィンドウを閉じるとサーバが止まります。
start "" http://localhost:8000/
%PY% serve.py
pause
