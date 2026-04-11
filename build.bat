@echo off
setlocal
echo [Magnolia] Starting Automated Sovereign Build (WSL2)...

:: Ensure the project directory is correct for WSL (mapped to /mnt/c/...)
:: We use the relative path inside the project root
:: Run the master build script in the Ubuntu environment as root
:: We pass %* to allow stage-specific builds (e.g., build.bat --core)
wsl -d Ubuntu -u root bash ./scripts/build_full_os.sh %*

if %ERRORLEVEL% NEQ 0 (
    echo [Magnolia ERROR] Build failed! Check the WSL console above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [Magnolia SUCCESS] OS Image ready at Magnolia.img
pause
endlocal
