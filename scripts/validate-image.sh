#!/bin/bash
# =============================================================================
# Magnolia OS - Image Validation Script
# =============================================================================
# Mounts the built image read-only and verifies all critical components
# are present before attempting a QEMU boot.
#
# Partition layout (from genimage.cfg):
#   Part 1: EFI System Partition (vfat, 64M)
#   Part 2: rootfs_a (ext4)
#   Part 3: rootfs_b (ext4)
#   Part 4: appdata (ext4, 1G)
#   Part 5: userdata (ext4, 2G)
# =============================================================================

set -euo pipefail

IMAGE="${1:-/root/buildroot/output/images/magnolia.img}"
MNT_ROOT="/mnt/magnolia-validate"
MNT_EFI="${MNT_ROOT}/efi"
MNT_ROOTFS="${MNT_ROOT}/rootfs"

PASS=0
FAIL=0
WARN=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

pass() {
    echo -e "  [${GREEN}PASS${NC}] $1"
    ((PASS++))
}

fail() {
    echo -e "  [${RED}FAIL${NC}] $1"
    ((FAIL++))
}

warn() {
    echo -e "  [${YELLOW}WARN${NC}] $1"
    ((WARN++))
}

LOOP_DEV=""

cleanup() {
    echo ""
    echo "[validate] Cleaning up mounts..."
    umount "${MNT_EFI}" 2>/dev/null || true
    umount "${MNT_ROOTFS}" 2>/dev/null || true
    if [ -n "${LOOP_DEV}" ]; then
        losetup -d "${LOOP_DEV}" 2>/dev/null || true
    fi
    rm -rf "${MNT_ROOT}"
}

trap cleanup EXIT

# --- Pre-flight ---
echo "============================================="
echo " Magnolia OS Image Validation"
echo "============================================="
echo ""

if [ ! -f "${IMAGE}" ]; then
    echo -e "[${RED}FATAL${NC}] Image not found: ${IMAGE}"
    exit 1
fi

echo "[validate] Image: ${IMAGE}"
echo "[validate] Size:  $(du -h "${IMAGE}" | cut -f1)"
echo ""

# --- Setup loop device ---
echo "[validate] Setting up loop device..."
LOOP_DEV=$(losetup --find --show --partscan --read-only "${IMAGE}")
echo "[validate] Loop device: ${LOOP_DEV}"

# Wait for partition devices to appear
sleep 1

# List discovered partitions
echo "[validate] Discovered partitions:"
lsblk "${LOOP_DEV}" 2>/dev/null || fdisk -l "${LOOP_DEV}"
echo ""

# Determine partition device naming (loopXp1 vs loopX-part1)
if [ -b "${LOOP_DEV}p1" ]; then
    PART_PREFIX="${LOOP_DEV}p"
elif [ -b "${LOOP_DEV}-part1" ]; then
    PART_PREFIX="${LOOP_DEV}-part"
else
    echo -e "[${RED}FATAL${NC}] Cannot find partition devices for ${LOOP_DEV}"
    echo "    Available: $(ls ${LOOP_DEV}* 2>/dev/null)"
    exit 1
fi

EFI_PART="${PART_PREFIX}1"
ROOTFS_A_PART="${PART_PREFIX}2"

# --- Mount partitions ---
mkdir -p "${MNT_EFI}" "${MNT_ROOTFS}"

echo "[validate] Mounting EFI partition (${EFI_PART})..."
mount -o ro "${EFI_PART}" "${MNT_EFI}"

echo "[validate] Mounting rootfs_a partition (${ROOTFS_A_PART})..."
mount -o ro "${ROOTFS_A_PART}" "${MNT_ROOTFS}"
echo ""

# =============================================================================
# CHECK GROUP 1: EFI Partition
# =============================================================================
echo "--- EFI Partition Checks ---"

# GRUB EFI binary
if [ -f "${MNT_EFI}/EFI/BOOT/BOOTX64.EFI" ]; then
    pass "GRUB EFI binary exists (EFI/BOOT/BOOTX64.EFI)"
    SIZE=$(stat -c%s "${MNT_EFI}/EFI/BOOT/BOOTX64.EFI")
    if [ "${SIZE}" -gt 100000 ]; then
        pass "GRUB EFI binary size is reasonable (${SIZE} bytes)"
    else
        warn "GRUB EFI binary is suspiciously small (${SIZE} bytes)"
    fi
else
    fail "GRUB EFI binary missing (EFI/BOOT/BOOTX64.EFI)"
fi

# grub.cfg
if [ -f "${MNT_EFI}/EFI/BOOT/grub.cfg" ]; then
    pass "grub.cfg exists"
    if grep -q "root=/dev/vda2" "${MNT_EFI}/EFI/BOOT/grub.cfg"; then
        pass "grub.cfg has correct root device (root=/dev/vda2)"
    else
        fail "grub.cfg missing root=/dev/vda2 (virtio disk reference)"
    fi
    if grep -q "console=ttyS0" "${MNT_EFI}/EFI/BOOT/grub.cfg"; then
        pass "grub.cfg has serial console (console=ttyS0)"
    else
        warn "grub.cfg missing serial console parameter"
    fi
    if grep -q "earlyprintk" "${MNT_EFI}/EFI/BOOT/grub.cfg"; then
        pass "grub.cfg has earlyprintk for debug"
    else
        warn "grub.cfg missing earlyprintk"
    fi
else
    fail "grub.cfg missing from EFI partition"
fi

# Kernel
if [ -f "${MNT_EFI}/EFI/BOOT/bzImage" ]; then
    pass "Linux kernel present (EFI/BOOT/bzImage)"
    SIZE=$(stat -c%s "${MNT_EFI}/EFI/BOOT/bzImage")
    if [ "${SIZE}" -gt 5000000 ]; then
        pass "Kernel size is reasonable (${SIZE} bytes / $((SIZE/1024/1024))MB)"
    else
        warn "Kernel is suspiciously small (${SIZE} bytes)"
    fi
else
    fail "Linux kernel missing from EFI partition (EFI/BOOT/bzImage)"
fi

# GRUB theme
if [ -f "${MNT_EFI}/EFI/BOOT/theme.txt" ]; then
    pass "GRUB theme present"
else
    warn "GRUB theme missing (cosmetic only)"
fi

echo ""

# =============================================================================
# CHECK GROUP 2: Root Filesystem - Init System
# =============================================================================
echo "--- Root Filesystem: Init System ---"

# magnolia-supervisor (PID 1 init) - installed to /usr/bin/ per magnolia-supervisor.mk
SUPERVISOR_BIN="${MNT_ROOTFS}/usr/bin/magnolia-supervisor"
if [ -f "${SUPERVISOR_BIN}" ]; then
    pass "magnolia-supervisor binary exists (/usr/bin/magnolia-supervisor)"
    if [ -x "${SUPERVISOR_BIN}" ]; then
        pass "magnolia-supervisor is executable"
    else
        fail "magnolia-supervisor is NOT executable"
    fi
    FILE_TYPE=$(file "${SUPERVISOR_BIN}")
    if echo "${FILE_TYPE}" | grep -q "ELF 64-bit"; then
        pass "magnolia-supervisor is ELF 64-bit binary"
    else
        fail "magnolia-supervisor is not an ELF 64-bit binary: ${FILE_TYPE}"
    fi
elif [ -f "${MNT_ROOTFS}/sbin/magnolia-supervisor" ]; then
    pass "magnolia-supervisor binary exists (/sbin/magnolia-supervisor, alternate path)"
else
    fail "magnolia-supervisor MISSING (checked /usr/bin/ and /sbin/)"
fi

# Check /sbin/init symlink -> ../usr/bin/magnolia-supervisor (per .mk file)
if [ -L "${MNT_ROOTFS}/sbin/init" ]; then
    INIT_TARGET=$(readlink "${MNT_ROOTFS}/sbin/init")
    if echo "${INIT_TARGET}" | grep -q "magnolia-supervisor"; then
        pass "/sbin/init symlink -> ${INIT_TARGET} (correct)"
    else
        fail "/sbin/init symlink points to unexpected target: ${INIT_TARGET}"
    fi
elif [ -f "${MNT_ROOTFS}/sbin/init" ]; then
    warn "/sbin/init is a regular file, not a symlink to magnolia-supervisor"
else
    warn "/sbin/init does not exist"
    # Check if grub.cfg has init= parameter as fallback
    if grep -q "init=" "${MNT_EFI}/EFI/BOOT/grub.cfg" 2>/dev/null; then
        pass "grub.cfg has explicit init= parameter"
    else
        fail "No /sbin/init and no init= in grub.cfg - kernel will panic at boot"
    fi
fi

echo ""

# =============================================================================
# CHECK GROUP 3: Root Filesystem - Magnolia Core (Tauri App)
# =============================================================================
echo "--- Root Filesystem: Magnolia Core ---"

# magnolia-hub binary (magnolia-core installed as magnolia-hub per .mk)
if [ -f "${MNT_ROOTFS}/sbin/magnolia-hub" ]; then
    pass "magnolia-core binary exists (/sbin/magnolia-hub)"
    if [ -x "${MNT_ROOTFS}/sbin/magnolia-hub" ]; then
        pass "magnolia-hub is executable"
    else
        fail "magnolia-hub is NOT executable"
    fi
else
    fail "magnolia-core binary MISSING (/sbin/magnolia-hub)"
fi

echo ""

# =============================================================================
# CHECK GROUP 4: Root Filesystem - Magnolia Interface (React Frontend)
# =============================================================================
echo "--- Root Filesystem: Magnolia Interface ---"

IFACE_DIR="${MNT_ROOTFS}/usr/share/magnolia/interface"
if [ -d "${IFACE_DIR}" ]; then
    pass "magnolia-interface directory exists"
    FILE_COUNT=$(find "${IFACE_DIR}" -type f | wc -l)
    if [ "${FILE_COUNT}" -gt 0 ]; then
        pass "magnolia-interface has ${FILE_COUNT} files"
    else
        fail "magnolia-interface directory is empty"
    fi
    if [ -f "${IFACE_DIR}/index.html" ]; then
        pass "magnolia-interface has index.html"
    else
        warn "magnolia-interface missing index.html (check React build output)"
    fi
else
    fail "magnolia-interface directory MISSING (/usr/share/magnolia/interface)"
fi

echo ""

# =============================================================================
# CHECK GROUP 5: Root Filesystem - Runtime Dependencies
# =============================================================================
echo "--- Root Filesystem: Runtime Dependencies ---"

# Cage compositor
if [ -f "${MNT_ROOTFS}/usr/bin/cage" ] || [ -f "${MNT_ROOTFS}/usr/local/bin/cage" ]; then
    pass "Cage Wayland compositor found"
else
    fail "Cage compositor MISSING (required for GUI)"
fi

# udev
if [ -f "${MNT_ROOTFS}/sbin/udevd" ] || [ -f "${MNT_ROOTFS}/lib/systemd/systemd-udevd" ] || [ -f "${MNT_ROOTFS}/usr/lib/udev/udevd" ]; then
    pass "udev daemon found"
else
    warn "udev daemon not found (supervisor expects /sbin/udevd)"
fi

# udevadm
if [ -f "${MNT_ROOTFS}/bin/udevadm" ] || [ -f "${MNT_ROOTFS}/usr/bin/udevadm" ] || [ -f "${MNT_ROOTFS}/sbin/udevadm" ]; then
    pass "udevadm found"
else
    warn "udevadm not found (supervisor uses it for device triggers)"
fi

# Essential directories the supervisor mounts to
for dir in proc sys dev tmp run; do
    if [ -d "${MNT_ROOTFS}/${dir}" ]; then
        pass "Mount point /${dir} exists"
    else
        warn "Mount point /${dir} missing (supervisor will create it)"
    fi
done

# Hostname
if [ -f "${MNT_ROOTFS}/etc/hostname" ]; then
    HOSTNAME_VAL=$(cat "${MNT_ROOTFS}/etc/hostname" | tr -d '\n')
    pass "Hostname set to: ${HOSTNAME_VAL}"
else
    warn "/etc/hostname missing"
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo "============================================="
echo " Validation Summary"
echo "============================================="
TOTAL=$((PASS + FAIL + WARN))
echo -e "  ${GREEN}PASS${NC}: ${PASS}"
echo -e "  ${RED}FAIL${NC}: ${FAIL}"
echo -e "  ${YELLOW}WARN${NC}: ${WARN}"
echo "  Total checks: ${TOTAL}"
echo ""

if [ "${FAIL}" -eq 0 ]; then
    echo -e "[${GREEN}RESULT${NC}] Image is READY for QEMU boot testing."
    echo ""
    echo "  Next step: /root/test-boot.sh"
    echo "  Or headless: /root/test-boot.sh --headless"
    exit 0
else
    echo -e "[${RED}RESULT${NC}] Image has ${FAIL} FAILURE(s). Fix before booting."
    exit 1
fi
