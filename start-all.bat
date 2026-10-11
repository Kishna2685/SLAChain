@echo off
setlocal enabledelayedexpansion
title SLAChain Launcher
color 0A

echo.
echo  =====================================================================
echo  =                                                                   =
echo  =        ^^   SLAChain - Blockchain SLA Enforcement System          =
echo  =       /  \  Automated Real-Time Penalty Execution Framework       =
echo  =      / __ \                                                       =
echo  =     /_/  \_\   Powered by Solidity, Hardhat, Ethers.js           =
echo  =                                                                   =
echo  =====================================================================
echo.
echo  Starting up... Please wait, this may take a minute on first run.
echo.

REM ─── STEP 0: Check Node.js is installed ─────────────────────────────────────
echo [CHECK] Verifying Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Node.js is NOT installed on this computer!
    echo.
    echo  Please install Node.js first:
    echo    1. Open a browser and go to:  https://nodejs.org/
    echo    2. Download the LTS version and install it
    echo    3. Restart this computer
    echo    4. Double-click start-all.bat again
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% found.

REM ─── STEP 1: Install root dependencies if missing ────────────────────────────
echo.
echo [1/5] Checking root dependencies (hardhat, ethers, express)...
if not exist "node_modules\hardhat" (
    echo  [INSTALL] node_modules not found. Running npm install... (this takes 1-2 mins)
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo  [ERROR] npm install failed! Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo  [OK] Root dependencies installed.
) else (
    echo  [OK] Root dependencies already installed.
)

REM ─── STEP 2: Install frontend dependencies if missing ────────────────────────
echo.
echo [2/5] Checking frontend dependencies (React, Vite, Tailwind)...
if not exist "client\node_modules\vite" (
    echo  [INSTALL] Client node_modules not found. Running npm install in client/...
    cd client
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo  [ERROR] Client npm install failed!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo  [OK] Frontend dependencies installed.
) else (
    echo  [OK] Frontend dependencies already installed.
)

REM ─── STEP 3: Compile smart contracts if artifacts are missing ─────────────────
echo.
echo [3/5] Checking smart contract artifacts...
if not exist "artifacts\contracts\SLAManager.sol\SLAManager.json" (
    echo  [COMPILE] Compiling Solidity contracts...
    call npx hardhat compile
    if %errorlevel% neq 0 (
        color 0C
        echo  [ERROR] Smart contract compilation failed!
        pause
        exit /b 1
    )
    echo  [OK] Smart contracts compiled.
) else (
    echo  [OK] Smart contracts already compiled.
)

REM ─── STEP 4: Launch Hardhat Blockchain Node ───────────────────────────────────
echo.
echo [4/5] Launching Hardhat Local Blockchain Node (port 8545)...
start "SLAChain [1] Hardhat Blockchain Node :8545" cmd /k "color 0B && echo SLAChain - Blockchain Node && echo. && npm run node"
echo  [OK] Blockchain node starting...
echo  [WAIT] Giving node 5 seconds to boot up...
timeout /t 5 /nobreak >nul

REM ─── STEP 5: Deploy Smart Contract ───────────────────────────────────────────
echo.
echo [5/5] Deploying SLAManager Smart Contract to local blockchain...
call npm run deploy:local
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Contract deployment failed!
    echo  Make sure the Hardhat node window opened successfully and is running.
    echo  Try closing all windows and running start-all.bat again.
    pause
    exit /b 1
)
echo  [OK] Smart contract deployed!

REM ─── Launch Remaining Services ────────────────────────────────────────────────
echo.
echo  Launching all remaining services...
echo.

start "SLAChain [2] Mock Microservice API :4000" cmd /k "color 0E && echo SLAChain - Mock Microservice API && echo. && npm run server"
timeout /t 2 /nobreak >nul

start "SLAChain [3] Oracle Monitor Bot :4001" cmd /k "color 0D && echo SLAChain - Oracle Monitor Bot && echo. && npm run oracle"
timeout /t 2 /nobreak >nul

start "SLAChain [4] Frontend Dashboard :5173" cmd /k "color 0A && echo SLAChain - Frontend Dashboard && echo. && npm run client"
timeout /t 4 /nobreak >nul

REM ─── Open Browser ─────────────────────────────────────────────────────────────
echo  Opening dashboard in browser...
start "" "http://localhost:5173"

echo.
echo  =====================================================================
echo  =                                                                   =
echo  =   SLAChain is RUNNING!  All 4 services are live:                 =
echo  =                                                                   =
echo  =     Blockchain Node  :  http://127.0.0.1:8545  (Chain ID 31337)  =
echo  =     Mock API Server  :  http://localhost:4000                     =
echo  =     Oracle Bot       :  http://localhost:4001/oracle/status       =
echo  =     Web3 Dashboard   :  http://localhost:5173  ^^^ OPEN THIS ^^^   =
echo  =                                                                   =
echo  =   Close this window to shut everything down.                      =
echo  =                                                                   =
echo  =====================================================================
echo.
pause
