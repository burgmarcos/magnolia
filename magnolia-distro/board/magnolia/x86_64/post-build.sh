#!/bin/bash
# Magnolia Post-Build Script
# This script runs inside the Buildroot environment after the target filesystem is assembled.

set -e

BOARD_DIR="$(dirname "$0")"
BINARIES_DIR="${2:-output/images}"
TARGET_DIR="${1:-output/target}"

echo "[Magnolia] Executing Post-Build Bundle..."

# 1. Copy the Magnolia Supervisor to /sbin/init (Static MUSL)
SUPERVISOR_SRC="/root/magnolia-workspace/magnolia-supervisor/target/x86_64-unknown-linux-musl/release/magnolia-supervisor"
CORE_SRC="/root/magnolia-workspace/magnolia-core/target/x86_64-unknown-linux-gnu/release/magnolia-core"

if [ -f "$SUPERVISOR_SRC" ]; then
    echo "[Magnolia] Deploying Static Supervisor to /sbin/init..."
    cp "$SUPERVISOR_SRC" "${TARGET_DIR}/sbin/init"
    chmod 755 "${TARGET_DIR}/sbin/init"
else
    echo "[Magnolia ERROR] Supervisor binary not found at $SUPERVISOR_SRC!"
    exit 1
fi

# 2. Copy the Magnolia Hub to /sbin/magnolia-hub (The UI App)
if [ -f "$CORE_SRC" ]; then
    echo "[Magnolia] Deploying Magnolia Dashboard Hub to /sbin/magnolia-hub..."
    cp "$CORE_SRC" "${TARGET_DIR}/sbin/magnolia-hub"
    chmod 755 "${TARGET_DIR}/sbin/magnolia-hub"
else
    echo "[Magnolia WARNING] magnolia-core binary not found at $CORE_SRC!"
fi

# 2. Copy the Magnolia Interface assets
# These are the web assets built from the React frontend.
INTERFACE_SRC="${BR2_EXTERNAL_MAGNOLIA_PATH}/../magnolia-interface/dist"
INTERFACE_DEST="${TARGET_DIR}/usr/share/magnolia-interface"

if [ -d "$INTERFACE_SRC" ]; then
    echo "[Magnolia] Copying magnolia-interface assets to $INTERFACE_DEST..."
    mkdir -p "$INTERFACE_DEST"
    cp -r "$INTERFACE_SRC/"* "$INTERFACE_DEST/"
else
    echo "[Magnolia WARNING] magnolia-interface dist directory not found at $INTERFACE_SRC!"
    echo "[Magnolia WARNING] Ensure you have run 'npm run build' in magnolia-interface."
fi

# 3. Inject Kernel for GRUB discovery
echo "[Magnolia] Injecting Kernel to /boot..."
mkdir -p "${TARGET_DIR}/boot"
if [ -f "${BINARIES_DIR}/bzImage" ]; then
    cp "${BINARIES_DIR}/bzImage" "${TARGET_DIR}/boot/bzImage"
else
    echo "[Magnolia WARNING] bzImage not found in ${BINARIES_DIR}! Kernel may not boot."
fi

# 4. Finalize permissions
chmod 644 "${TARGET_DIR}/etc/hostname"
chmod 644 "${TARGET_DIR}/etc/hosts"

# 5. Copy GRUB themes to Images directory
echo "[Magnolia] Staging GRUB Theme assets..."
if [ -d "${BOARD_DIR}/grub-theme" ]; then
    cp -r "${BOARD_DIR}/grub-theme" "${BINARIES_DIR}/"
fi

echo "[Magnolia] Post-Build Bundle Complete."
