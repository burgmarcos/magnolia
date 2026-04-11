#!/bin/bash
# Magnolia OS Master Build Orchestrator (v3.0 - MODULAR & CACHED)
# This version supports chunked builds and persistent caching for extreme speed.

set -e
set -o pipefail

# Configuration
WINDOWS_ROOT=$(pwd)
rm -f "${WINDOWS_ROOT}/magnolia.img"
NATIVE_WORKSPACE="${HOME}/magnolia-workspace"
LOG_FILE="${WINDOWS_ROOT}/build.log"

# Paths
INTERFACE_DIR="${NATIVE_WORKSPACE}/magnolia-interface"
CORE_DIR="${NATIVE_WORKSPACE}/magnolia-core"
DISTRO_DIR="${NATIVE_WORKSPACE}/magnolia-distro"
BUILDROOT_DIR="${HOME}/magnolia-buildroot"
NATIVE_CARGO_TARGET="${HOME}/magnolia-cargo-target"

# HARD-CODED PATHS (Persistence)
export CARGO_HOME="${HOME}/.cargo"
export RUSTUP_HOME="${HOME}/.rustup"
export PATH="${CARGO_HOME}/bin:${PATH}"

# Modular Flags
STAGES=("$@")
BUILD_ALL=true
[[ " ${STAGES[@]} " =~ " --" ]] && BUILD_ALL=false

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Magnolia OS Master Build Sequence [v3.0 MODULAR] ===${NC}"
echo "Build started at $(date)" > "$LOG_FILE"

# 0. Environment & Migration (Always ensures workspace is sync'd)
echo -e "${BLUE}[0/4] Workspace Sync...${NC}"
{
    echo "--- Phase 0: Environment ---"
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -yq
    apt-get install -yq bc cpio unzip rsync wget git build-essential pkg-config \
        libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev \
        librsvg2-dev libxdo-dev libjavascriptcoregtk-4.1-dev libsecret-1-dev ccache \
        libelf-dev binutils-dev dosfstools mtools
} 2>&1 | tee -a "$LOG_FILE"

if [ ! -x "${CARGO_HOME}/bin/cargo" ]; then
    echo -e "${YELLOW}[Magnolia] Rust not found. Installing...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path >> "$LOG_FILE" 2>&1
fi

mkdir -p "$NATIVE_WORKSPACE"
rsync -av --exclude 'node_modules' --exclude 'target' --exclude 'buildroot' \
    "${WINDOWS_ROOT}/" "$NATIVE_WORKSPACE/" >> "$LOG_FILE" 2>&1

# 1. Magnolia Interface (Frontend)
if [[ $BUILD_ALL == true || " ${STAGES[@]} " =~ " --ui " ]]; then
    echo -e "${BLUE}[1/4] Building Magnolia Interface...${NC}"
    {
        cd "$INTERFACE_DIR"
        npm install --prefer-offline
        npm run build
    } 2>&1 | tee -a "$LOG_FILE"
    echo -e "${GREEN}[DONE] Interface bundled.${NC}"
else
    echo -e "${YELLOW}[SKIP] Interface bundling.${NC}"
fi

# 2. Magnolia Core (Rust Supervisor)
if [[ $BUILD_ALL == true || " ${STAGES[@]} " =~ " --core " ]]; then
    echo -e "${BLUE}[2/4] Compiling Magnolia Core (Incremental)...${NC}"
    {
        cd "$CORE_DIR"
        export CARGO_TARGET_DIR="$NATIVE_CARGO_TARGET"
        mkdir -p "$CARGO_TARGET_DIR"
        cargo build --release --target x86_64-unknown-linux-gnu -j 4
        
        # Sync binary
        mkdir -p "${CORE_DIR}/target/x86_64-unknown-linux-gnu/release"
        cp "${NATIVE_CARGO_TARGET}/x86_64-unknown-linux-gnu/release/magnolia-core" "${CORE_DIR}/target/x86_64-unknown-linux-gnu/release/magnolia-core"
    } 2>&1 | tee -a "$LOG_FILE"
    echo -e "${GREEN}[DONE] Core compiled.${NC}"
else
    echo -e "${YELLOW}[SKIP] Core compilation.${NC}"
fi

# 2.5 Magnolia Supervisor (PID 1 Init)
if [[ $BUILD_ALL == true || " ${STAGES[@]} " =~ " --core " ]]; then
    echo -e "${BLUE}[2.5/4] Compiling Magnolia Supervisor (Static)...${NC}"
    {
        cd "$NATIVE_WORKSPACE/magnolia-supervisor"
        # We use musl for a truly static init binary
        rustup target add x86_64-unknown-linux-musl
        cargo build --release --target x86_64-unknown-linux-musl -j 4
    } 2>&1 | tee -a "$LOG_FILE"
    echo -e "${GREEN}[DONE] Supervisor compiled.${NC}"
fi

# 3. OS Image (Buildroot)
if [[ $BUILD_ALL == true || " ${STAGES[@]} " =~ " --iso " ]]; then
    echo -e "${BLUE}[3/4] Generating Magnolia System Image (Cached)...${NC}"
    if [ ! -d "$BUILDROOT_DIR" ]; then
        git clone https://github.com/buildroot/buildroot.git "$BUILDROOT_DIR" >> "$LOG_FILE" 2>&1
    fi
    {
        cd "$BUILDROOT_DIR"
        export BR2_EXTERNAL="${DISTRO_DIR}"
        # Surgical PATH filter: Remove only Windows-leaked paths (which contain spaces)
        # while preserving all native Linux system paths
        export PATH=$(echo $PATH | tr ':' '\n' | grep -v "/mnt/c/" | tr '\n' ':' | sed 's/:$//')
        # Add Rust and common native bins to be safe
        export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${CARGO_HOME}/bin:${PATH}"
        # Forge is now clean. Preserving state for rapid iteration.
        # Apply defconfig and automatically migrate legacy settings
        make magnolia_x86_64_defconfig
        make olddefconfig
        # Purge any remaining legacy markers
        sed -i '/BR2_LEGACY/d' .config
        # Trigger the optimized build with throttled local cores to prevent OOM
        make -j4
    } 2>&1 | tee -a "$LOG_FILE"
else
    echo -e "${YELLOW}[SKIP] ISO generation.${NC}"
fi

# 4. Finalize
if [ -f "${BUILDROOT_DIR}/output/images/magnolia.img" ]; then
    echo -e "${GREEN}=== Magnolia Build Successful ===${NC}"
    cp "${BUILDROOT_DIR}/output/images/magnolia.img" "${WINDOWS_ROOT}/magnolia.img"
    echo -e "${BLUE}Disk Image: ${WINDOWS_ROOT}/magnolia.img${NC}"
else
    echo -e "\033[0;31m[ERROR] Build completed but magnolia.img not found! Check build.log.${NC}"
    exit 1
fi
