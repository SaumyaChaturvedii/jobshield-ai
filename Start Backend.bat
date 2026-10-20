@echo off
title JobShield AI - Website and Backend
cd /d "%~dp0"

set "PYTHON="
if exist "%~dp0Backend\.venv\Scripts\python.exe" set "PYTHON=%~dp0Backend\.venv\Scripts\python.exe"

if not defined PYTHON if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PYTHON=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not defined PYTHON if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" set "PYTHON=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"

if not defined PYTHON (
    where py >nul 2>nul
    if not errorlevel 1 set "PYTHON=py -3"
)

if not defined PYTHON (
    where python >nul 2>nul
    if not errorlevel 1 set "PYTHON=python"
)

if not defined PYTHON (
    echo Python 3 was not found. Install Python 3.11 or later, then restart this file.
    pause
    exit /b 1
)

%PYTHON% -m uvicorn Backend.main:app --host 127.0.0.1 --port 8000
if errorlevel 1 echo Backend stopped with an error. Check the setup steps in README.md.
pause
