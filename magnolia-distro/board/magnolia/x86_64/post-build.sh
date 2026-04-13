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
# Note: magnolia-interface.mk also installs via generic-package INSTALL_TARGET_CMDS,
# but this fallback ensures assets are present even if the .mk install was skipped.
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

# 5. Install Mesa DRI drivers (gallium megadriver + symlinks)
# Buildroot's mesa3d package doesn't install DRI symlinks for Wayland-only softpipe builds.
# WebKitGTK needs a working EGL/DRI stack to avoid crashing.
MESA_DRI_SRC="${TARGET_DIR}/../build/mesa3d-*/buildroot-build/src/gallium/targets/dri/libgallium-*.so"
DRI_DIR="${TARGET_DIR}/usr/lib/dri"
if ls ${MESA_DRI_SRC} 1>/dev/null 2>&1; then
    echo "[Magnolia] Installing Mesa DRI gallium driver..."
    mkdir -p "${DRI_DIR}"
    DRI_SO=$(ls ${MESA_DRI_SRC} | head -1)
    DRI_NAME=$(basename "${DRI_SO}")
    cp "${DRI_SO}" "${DRI_DIR}/${DRI_NAME}"
    cd "${DRI_DIR}"
    ln -sf "${DRI_NAME}" swrast_dri.so
    ln -sf "${DRI_NAME}" kms_swrast_dri.so
    ln -sf "${DRI_NAME}" virtio_gpu_dri.so
    cd -
fi

# 6. Install stub libGL.so.1 for WebKitGTK compatibility
# WebKitGTK unconditionally dlopen()s libGL.so.1 and crashes (SIGABRT) if not found.
# This stub provides minimal GL API so WebKit can initialize and fall back to software rendering.
STUB_GL="${BOARD_DIR}/stub-libGL.c"
if [ -f "${STUB_GL}" ] && [ -x "${HOST_DIR}/bin/x86_64-buildroot-linux-gnu-gcc" ]; then
    echo "[Magnolia] Building stub libGL.so.1..."
    "${HOST_DIR}/bin/x86_64-buildroot-linux-gnu-gcc" -shared \
        -o "${TARGET_DIR}/usr/lib/libGL.so.1.0.0" \
        "${STUB_GL}" -Wl,-soname,libGL.so.1
    cd "${TARGET_DIR}/usr/lib"
    ln -sf libGL.so.1.0.0 libGL.so.1
    ln -sf libGL.so.1 libGL.so
    cd -
elif [ -f "${TARGET_DIR}/usr/lib/libGL.so.1" ]; then
    echo "[Magnolia] libGL.so.1 already present."
else
    echo "[Magnolia WARNING] No libGL.so stub built. WebKitGTK may crash."
fi

echo "[Magnolia] Post-Build Bundle Complete."
