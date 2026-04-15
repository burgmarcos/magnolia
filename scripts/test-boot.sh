#!/bin/bash
# =============================================================================
# Magnolia OS - QEMU UEFI Boot Test Script
# =============================================================================
# Boot chain: UEFI (OVMF) -> GRUB2 EFI -> Linux 6.12.9 -> magnolia-supervisor
#             -> Cage (Wayland kiosk) -> magnolia-core (Tauri v2)
#
# Disk layout (GPT):
#   Part 1: EFI (64M) - GRUB EFI, bzImage, grub.cfg, theme
#   Part 2: rootfs_a (ext4) - Active root
#   Part 3: rootfs_b (ext4) - A/B update slot
#   Part 4: appdata (1G)
#   Part 5: userdata (2G)
# =============================================================================

set -euo pipefail

IMAGE="/root/buildroot/output/images/magnolia.img"
OVMF_CODE="/usr/share/OVMF/OVMF_CODE_4M.fd"
OVMF_VARS="/usr/share/OVMF/OVMF_VARS_4M.fd"
OVMF_VARS_COPY="/root/ovmf_vars_magnolia.fd"
LOG_DIR="/root/qemu-logs"
SERIAL_LOG="${LOG_DIR}/serial.log"
QEMU_LOG="${LOG_DIR}/qemu.log"

# --- Pre-flight checks ---
echo "[test-boot] Magnolia QEMU Boot Test"
echo "[test-boot] ========================"
echo ""

if [ ! -f "${IMAGE}" ]; then
    echo "[FAIL] Image not found: ${IMAGE}"
    echo "       Build must complete first. Run your Buildroot build."
    exit 1
fi

check_ovmf() {
    missing_ovmf=0
    [ -f "${OVMF_CODE}" ] || missing_ovmf=1
    [ -f "${OVMF_VARS}" ] || missing_ovmf=1
}

check_ovmf
if [ "${missing_ovmf}" -ne 0 ]; then
    echo "[WARN] OVMF not found. Installing..."
    set +e
    apt-get update -qq && apt-get install -y -qq ovmf qemu-system-x86
    install_status=$?
    set -e
    if [ "${install_status}" -ne 0 ]; then
        echo "[WARN] OVMF install attempt failed with status ${install_status}. Continuing with validation..."
    fi
fi

check_ovmf
if [ "${missing_ovmf}" -ne 0 ]; then
    echo "[FAIL] OVMF still not found after install attempt."
    if [ ! -f "${OVMF_CODE}" ]; then
        echo "       Missing OVMF_CODE: ${OVMF_CODE}"
    fi
    if [ ! -f "${OVMF_VARS}" ]; then
        echo "       Missing OVMF_VARS: ${OVMF_VARS}"
    fi
    echo "       Checked the paths above after attempting: apt-get install ovmf qemu-system-x86"
    exit 1
fi

# Create writable copy of OVMF vars (UEFI needs to write NVRAM)
if [ ! -f "${OVMF_VARS_COPY}" ]; then
    echo "[test-boot] Creating writable OVMF VARS copy..."
    cp "${OVMF_VARS}" "${OVMF_VARS_COPY}"
fi

mkdir -p "${LOG_DIR}"

echo "[test-boot] Image:       ${IMAGE}"
echo "[test-boot] Image size:  $(du -h "${IMAGE}" | cut -f1)"
echo "[test-boot] OVMF Code:   ${OVMF_CODE}"
echo "[test-boot] Serial log:  ${SERIAL_LOG}"
echo ""

# --- Parse flags ---
MODE="serial"  # default: serial console to stdout
VNC_PORT="5900"

while [[ $# -gt 0 ]]; do
    case $1 in
        --gui)
            MODE="gui"
            shift
            ;;
        --vnc)
            MODE="vnc"
            shift
            ;;
        --headless)
            MODE="headless"
            shift
            ;;
        --log-only)
            MODE="log-only"
            shift
            ;;
        *)
            echo "Usage: $0 [--gui|--vnc|--headless|--log-only]"
            exit 1
            ;;
    esac
done

# --- Build base QEMU command ---
QEMU_ARGS=(
    # UEFI firmware (split code/vars for clean NVRAM)
    -drive "if=pflash,format=raw,readonly=on,file=${OVMF_CODE}"
    -drive "if=pflash,format=raw,file=${OVMF_VARS_COPY}"
    # Disk: virtio for performance (matches grub.cfg root=/dev/vda2)
    -drive "file=${IMAGE},format=raw,if=virtio,cache=writeback"
    # Resources
    -m 2G
    -smp 2
    # Network: user-mode with SSH forwarding
    -netdev user,id=net0,hostfwd=tcp::2222-:22
    -device virtio-net-pci,netdev=net0
    # GPU + Input: virtio devices required for Cage/Wayland compositor
    -device virtio-gpu-pci
    -device virtio-keyboard-pci
    -device virtio-mouse-pci
    # Misc
    -name "magnolia-test"
    -D "${QEMU_LOG}"
    -d guest_errors,unimp
)

# KVM detection: use -cpu host + KVM if available, else TCG
if [ -e /dev/kvm ]; then
    QEMU_ARGS+=(-enable-kvm -cpu host)
    echo "[test-boot] KVM acceleration: enabled"
else
    QEMU_ARGS+=(-cpu qemu64)
    echo "[WARN] /dev/kvm not available. Using TCG emulation (slower)."
fi

# Display and serial configuration based on mode
case ${MODE} in
    serial)
        # Serial to stdio for interactive debugging
        QEMU_ARGS+=(-serial stdio -display none)
        echo "[test-boot] Mode: serial console (interactive)"
        echo "[test-boot] Press Ctrl-A X to exit QEMU"
        ;;
    gui)
        # Full GUI window (requires X11 forwarding or WSLg)
        QEMU_ARGS+=(-serial "file:${SERIAL_LOG}" -display gtk)
        echo "[test-boot] Mode: GUI (GTK window)"
        echo "[test-boot] Serial log: tail -f ${SERIAL_LOG}"
        ;;
    vnc)
        QEMU_ARGS+=(-serial "file:${SERIAL_LOG}" -vnc :0)
        echo "[test-boot] Mode: VNC on port ${VNC_PORT}"
        echo "[test-boot] Connect with: vncviewer localhost:${VNC_PORT}"
        ;;
    headless)
        QEMU_ARGS+=(-nographic)
        echo "[test-boot] Mode: headless (serial to stdio, no display)"
        ;;
    log-only)
        QEMU_ARGS+=(-serial "file:${SERIAL_LOG}" -display none -daemonize)
        echo "[test-boot] Mode: log-only (daemonized)"
        echo "[test-boot] Monitor serial log: tail -f ${SERIAL_LOG}"
        ;;
esac

echo ""
echo "[test-boot] Launching QEMU..."
echo "[test-boot] ========================"
echo ""

exec qemu-system-x86_64 "${QEMU_ARGS[@]}"
