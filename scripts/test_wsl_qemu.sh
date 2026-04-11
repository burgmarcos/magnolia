#!/bin/bash
# Magnolia - WSL2 QEMU Boot Test

IMAGE_PATH="${HOME}/magnolia-buildroot/output/images/magnolia.img"
# Fallback to current project dir if buildroot location is missing
[ ! -f "$IMAGE_PATH" ] && IMAGE_PATH="$(pwd)/magnolia.img"
OVMF_PATH="/usr/share/ovmf/OVMF.fd"

# 1. Install Dependencies
echo "[Magnolia] Verifying QEMU and UEFI headers..."
apt-get update -yq && apt-get install -yq qemu-system-x86 qemu-utils ovmf

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
    -bios $OVMF_PATH \
    -drive file=$IMAGE_PATH,if=none,id=drive0,format=raw,snapshot=on \
    -device virtio-blk-pci,drive=drive0 \
    -net nic -net user \
    -vga std \
    -display gtk \
    -serial file:/tmp/Magnolia_boot.log
