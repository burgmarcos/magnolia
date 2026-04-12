#!/bin/bash
# Magnolia - WSL2 QEMU Boot Test (v2.0)

set -e

IMAGE_PATH="${HOME}/magnolia-buildroot/output/images/magnolia.img"
# Fallback to current project dir if buildroot location is missing
[ ! -f "$IMAGE_PATH" ] && IMAGE_PATH="$(pwd)/magnolia.img"
# Fallback to Windows-side project root (accessed via /mnt/c)
[ ! -f "$IMAGE_PATH" ] && IMAGE_PATH="/mnt/c/Users/burgm/OneDrive/Documentos/bOS/magnolia.img"
OVMF_PATH="/usr/share/ovmf/OVMF.fd"

if [ ! -f "$IMAGE_PATH" ]; then
    echo "[Magnolia ERROR] No magnolia.img found! Run build.bat first."
    exit 1
fi

echo "[Magnolia] Image: $IMAGE_PATH ($(du -h "$IMAGE_PATH" | cut -f1))"

# 1. Install Dependencies (idempotent)
echo "[Magnolia] Verifying QEMU and UEFI headers..."
dpkg -l | grep -q qemu-system-x86 || apt-get update -yq && apt-get install -yq qemu-system-x86 qemu-utils ovmf

# 2. Check for KVM
KVM_FLAG=""
if [ -e /dev/kvm ]; then
    echo "[Magnolia] KVM Acceleration detected. High-performance mode enabled."
    KVM_FLAG="-enable-kvm -cpu host"
else
    echo "[Magnolia] KVM not found. Running in emulation mode (Slow)."
    KVM_FLAG="-cpu qemu64"
fi

# 3. Export WSLg Display
export DISPLAY=${DISPLAY:-:0}
export WAYLAND_DISPLAY=${WAYLAND_DISPLAY:-wayland-0}

# 4. Boot Magnolia
echo "[Magnolia] Booting Sovereign Magnolia. Close the QEMU window to return."
qemu-system-x86_64 \
    $KVM_FLAG \
    -m 4G \
    -smp 4 \
    -bios $OVMF_PATH \
    -drive file=$IMAGE_PATH,if=none,id=drive0,format=raw,snapshot=on \
    -device virtio-blk-pci,drive=drive0 \
    -device virtio-vga \
    -device virtio-keyboard-pci \
    -device virtio-tablet-pci \
    -net nic,model=virtio -net user \
    -display gtk,show-cursor=on \
    -device virtio-rng-pci \
    -serial file:/tmp/magnolia_boot.log

echo "[Magnolia] Session ended. Boot log: /tmp/magnolia_boot.log"
