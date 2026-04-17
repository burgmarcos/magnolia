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
    cp -r "$INTERFACE_SRC/." "$INTERFACE_DEST/"
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

# 6. Provide libGL.so.1 for WebKitGTK compatibility
# Priority:
#   (a) Real libGL.so.1 from libglvnd GLX dispatch (>40KB) — use it
#   (b) Symlink libOpenGL.so.0 as libGL.so.1 — WebKit on Wayland uses EGL for GL contexts;
#       GLX entry points aren't needed. libOpenGL provides all OpenGL core/compat symbols
#       and routes draws through libGLdispatch → Mesa softpipe (real rendering, not noop).
#   (c) Compiled noop stub — LAST RESORT. Renders BLACK (every draw call is a noop).
STUB_GL="${BOARD_DIR}/stub-libGL.c"
EXISTING_LIBGL="${TARGET_DIR}/usr/lib/libGL.so.1"
LIBOPENGL_REAL="${TARGET_DIR}/usr/lib/libOpenGL.so.0.0.0"

# Detect if an existing libGL.so.1 is our 22KB stub vs a real library
EXISTING_IS_STUB=0
if [ -e "${EXISTING_LIBGL}" ]; then
    LIBGL_SIZE=$(stat -L -c %s "${EXISTING_LIBGL}" 2>/dev/null || echo 0)
    if [ "${LIBGL_SIZE}" -lt 40000 ]; then
        EXISTING_IS_STUB=1
    fi
fi

if [ -e "${EXISTING_LIBGL}" ] && [ "${EXISTING_IS_STUB}" = "0" ]; then
    echo "[Magnolia] Real libGL.so.1 present (>40KB, from libglvnd GLX) — leaving in place."
elif [ -e "${LIBOPENGL_REAL}" ]; then
    echo "[Magnolia] Wiring libGL.so.1 → libOpenGL.so.0.0.0 (libglvnd vendor-neutral OpenGL)."
    # Remove any prior stub artifacts so the symlink takes effect
    rm -f "${TARGET_DIR}/usr/lib/libGL.so.1.0.0"
    rm -f "${TARGET_DIR}/usr/lib/libGL.so.1"
    rm -f "${TARGET_DIR}/usr/lib/libGL.so"
    cd "${TARGET_DIR}/usr/lib"
    ln -sf libOpenGL.so.0.0.0 libGL.so.1
    ln -sf libGL.so.1 libGL.so
    cd -
elif [ -f "${STUB_GL}" ] && [ -x "${HOST_DIR}/bin/x86_64-buildroot-linux-gnu-gcc" ]; then
    echo "[Magnolia WARNING] No libOpenGL.so.0 — installing noop stub (display will render BLACK)."
    "${HOST_DIR}/bin/x86_64-buildroot-linux-gnu-gcc" -shared -fPIC -O2 \
        -o "${TARGET_DIR}/usr/lib/libGL.so.1.0.0" \
        "${STUB_GL}" -Wl,-soname,libGL.so.1
    cd "${TARGET_DIR}/usr/lib"
    ln -sf libGL.so.1.0.0 libGL.so.1
    ln -sf libGL.so.1 libGL.so
    cd -
else
    echo "[Magnolia WARNING] No libGL.so available. WebKitGTK may crash."
fi

# 7. GL stack verification — dumps what's actually on disk so we can diagnose from build log.
echo "[Magnolia] === GL stack verification ==="
for pat in "libGL*" "libEGL*" "libOpenGL*" "libGLdispatch*" "libGLESv*" "libgbm*"; do
    ls -la "${TARGET_DIR}/usr/lib/"${pat} 2>/dev/null || true
done
echo "[Magnolia] === DRI drivers ==="
ls -la "${TARGET_DIR}/usr/lib/dri/" 2>/dev/null || echo "[Magnolia WARNING] /usr/lib/dri missing"
echo "[Magnolia] === End GL stack ==="

echo "[Magnolia] Post-Build Bundle Complete."
