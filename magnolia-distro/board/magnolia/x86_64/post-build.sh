#!/bin/bash
# Magnolia Post-Build Script
# This script runs inside the Buildroot environment after the target filesystem is assembled.

set -e

BOARD_DIR="$(dirname "$0")"
BINARIES_DIR="${2:-output/images}"
TARGET_DIR="${1:-output/target}"

echo "[Magnolia] Executing Post-Build Bundle..."

# 1. Deploy Magnolia Interface assets
# These are the web assets built from the React frontend.
# Expects magnolia-interface/dist to exist (built in workflow)
INTERFACE_SRC="${BR2_EXTERNAL_MAGNOLIA_PATH}/../magnolia-interface/dist"
INTERFACE_DEST="${TARGET_DIR}/usr/share/magnolia/interface"

if [ -d "$INTERFACE_SRC" ]; then
    echo "[Magnolia] Copying magnolia-interface assets to $INTERFACE_DEST..."
    mkdir -p "$INTERFACE_DEST"
    cp -r "$INTERFACE_SRC/"* "$INTERFACE_DEST/"
else
    echo "[Magnolia ERROR] magnolia-interface dist directory not found at $INTERFACE_SRC!"
    echo "[Magnolia ERROR] This will cause the Dashboard Hub to display a blank screen."
    # We don't exit 1 here to allow the build to finish for debugging, but it's a critical warning.
fi

# 2. Inject Kernel for GRUB discovery
echo "[Magnolia] Injecting Kernel to /boot..."
mkdir -p "${TARGET_DIR}/boot"
if [ -f "${BINARIES_DIR}/bzImage" ]; then
    cp "${BINARIES_DIR}/bzImage" "${TARGET_DIR}/boot/bzImage"
else
    echo "[Magnolia WARNING] bzImage not found in ${BINARIES_DIR}! Check kernel configuration."
fi

# 3. Finalize permissions and system configuration
echo "[Magnolia] Finalizing system configuration..."
chmod 644 "${TARGET_DIR}/etc/hostname"
chmod 644 "${TARGET_DIR}/etc/hosts"

# 4. Copy GRUB themes to Images directory for EFI partition generation
echo "[Magnolia] Staging GRUB Theme assets..."
if [ -d "${BOARD_DIR}/grub-theme" ]; then
    cp -r "${BOARD_DIR}/grub-theme" "${BINARIES_DIR}/"
fi

echo "[Magnolia] Post-Build Bundle Complete."
