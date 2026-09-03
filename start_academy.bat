@echo off
TITLE Checkmate Chess Academy Management System
echo ======================================================
echo   STARTING CHECKMATE ACADEMY MANAGEMENT SYSTEM
echo ======================================================
echo.

:: Set current directory to the script location
cd /d "%~dp0"

:: 1. Check if Python is installed
echo [DEBUG] Checking for Python...
python --version >nul 2>&1
if errorlevel 1 goto NO_PYTHON
echo [SUCCESS] Python found.

:: 2. Create Virtual Environment if it doesn't exist
if exist venv goto ACTIVATE_VENV
echo [INFO] Creating virtual environment (venv)...
python -m venv venv
if errorlevel 1 goto VENV_ERROR

:ACTIVATE_VENV
echo [INFO] Activating virtual environment...
if not exist venv\Scripts\activate.bat goto ACTIVATE_ERROR
call venv\Scripts\activate.bat

:: 3. Upgrade Pip and Install Requirements
echo [INFO] Upgrading pip...
python -m pip install --upgrade pip -q

echo [INFO] Installing/Updating dependencies from requirements.txt...
pip install -r requirements.txt
if errorlevel 1 goto INSTALL_ERROR

:: 4. Start the Frontend Application
echo [INFO] Starting Frontend Dev Server...
start cmd /k "cd frontend && npm install && npm run dev"

:: 5. Start the Backend Server
echo.
echo ======================================================
echo   BACKEND SERVER STARTING AT http://127.0.0.1:8100
echo   FRONTEND SERVER STARTING IN A NEW WINDOW
echo   Press Ctrl+C to stop the backend server
echo ======================================================
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8100
if errorlevel 1 goto SERVER_ERROR

pause
exit /b

:NO_PYTHON
echo [ERROR] Python is not installed or not in your PATH.
echo Please install Python from https://www.python.org/ and check "Add Python to PATH"
pause
exit /b

:VENV_ERROR
echo [ERROR] Failed to create virtual environment.
pause
exit /b

:ACTIVATE_ERROR
echo [ERROR] Virtual environment activation script not found.
pause
exit /b

:INSTALL_ERROR
echo [ERROR] Failed to install dependencies.
pause
exit /b

:SERVER_ERROR
echo [ERROR] The server failed to start or was stopped unexpectedly.
pause
exit /b
