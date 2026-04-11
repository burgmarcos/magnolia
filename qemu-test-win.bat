@echo off
setlocal
echo [Magnolia] Magnolia OS Simulation Launcher [v1.1]
echo =================================================

:: Configuration
set "IMAGE_FILE=magnolia.img"
set "GRAPHICS_MODE=virtio-vga-gl"
set "DISPLAY_TYPE=sdl,gl=on"

:: Optional Safe Mode Argument
if "%~1"=="--safe" (
    echo [Magnolia] SAFE GRAPHICS MODE ENABLED.
    set "GRAPHICS_MODE=std"
    set "DISPLAY_TYPE=sdl"
)

:: 1. Check for Native Windows QEMU
where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [Magnolia] Native Windows QEMU detected.
    qemu-system-x86_64 ^
        -machine q35 ^
        -cpu host ^
        -accel whpx,kernel-irqchip=off -accel tcg ^
        -smp 4 ^
        -m 4G ^
        -vga %GRAPHICS_MODE% ^
        -display %DISPLAY_TYPE% ^
        -drive if=pflash,format=raw,readonly=on,file="C:\Program Files\qemu\share\edk2-x86_64-code.fd" ^
        -drive file=%IMAGE_FILE%,format=raw,if=virtio ^
        -net nic,model=virtio -net user ^
        -device virtio-rng-pci
    goto :END
)

:: 2. Fallback to WSL2 QEMU (Recommended for this workspace)
echo [Magnolia] Native QEMU not in PATH. Launching via WSL2 (Ubuntu)...
echo [Magnolia] Syncing scripts and workspace (excluding heavy images)...
wsl -d Ubuntu -u root bash -c "mkdir -p /root/magnolia-workspace && rsync -av --exclude 'node_modules' --exclude 'target' --exclude 'buildroot' --exclude '*.img' /mnt/c/Users/burgm/OneDrive/Documentos/bOS/ /root/magnolia-workspace/"

echo [Magnolia] Note: Requires WSLg or an active X-Server on Windows.

:: We use the path established by the build orchestrator
wsl -d Ubuntu -u root bash -c "cd /root/magnolia-workspace && ./scripts/test_wsl_qemu.sh"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Magnolia ERROR] Simulation failed to start via WSL.
    echo 1. Ensure WSLg is working (Windows 11 or latest Win10).
    echo 2. Check if 'qemu-system-x86' is installed in Ubuntu.
    echo 3. Run 'build.bat --iso' to ensure the image is generated.
    pause
)

:END
echo [Magnolia] Session ended.
endlocal
