# Magnolia OS Handoff Status

## Current State (2026-04-13) — BOOT CHAIN COMPLETE, DISPLAY RENDERING IN PROGRESS

| Component | Status | Details |
|-----------|--------|---------|
| **Boot Chain** | ✅ VERIFIED | UEFI → GRUB2 → Linux 6.12.9 → magnolia-supervisor → Cage → magnolia-hub |
| **magnolia-supervisor** | ✅ RUNNING | Rust PID 1 init, all subsystems initializing |
| **magnolia-hub (Tauri v2)** | ✅ STABLE | Tauri plugins loaded, DB initialized, all pulses active |
| **Cage (Wayland kiosk)** | ✅ RUNNING | pixman renderer, 1280x800@75Hz on Virtual-1 connector |
| **WebKitGTK 2.50.5** | ✅ COMPLETE | 4,249 cmake units compiled successfully |
| **libglvnd** | ✅ INSTALLED | libOpenGL.so.0, libGLdispatch.so.0 — real GL dispatch |
| **Mesa DRI drivers** | ✅ INSTALLED | swrast_dri.so, kms_swrast_dri.so, virtio_gpu_dri.so |
| **GRUB2 2.12** | ✅ COMPLETE | Magnolia flower theme visible in QEMU GUI |
| **Linux Kernel 6.12.9** | ✅ COMPLETE | Boots with virtio drivers |
| **License** | ✅ AGPL-3.0 | |
| **Website** | ✅ LIVE | https://burgmarcos.github.io/magnolia/ |
| **Display output** | 🔧 IN PROGRESS | Cage owns framebuffer but Hub content renders black |

---

## Three Critical Fixes That Made Boot Work

### 1. wlroots XDG Assertion Patch
- **File:** `/root/buildroot/package/wlroots/0003-xdg-surface-graceful-uninit.patch`
- **Problem:** Cage SIGABRTs when WebKitGTK creates surfaces before XDG handshake completes
- **Fix:** Removes fatal assert in `wlr_xdg_surface_schedule_configure`, replaces with log+proceed

### 2. libGL.so.1 Stub Library (v3)
- **Source:** `magnolia-distro/board/magnolia/x86_64/stub-libGL.c`
- **Problem:** WebKitGTK unconditionally dlopen()s libGL.so.1 and SIGABRTs if not found
- **Fix:** Stub reports GL 2.1 with NPOT extension, valid shader compile/link. Prevents crash but all draw calls are noops (renders black). Real GL rendering routes through libglvnd → libOpenGL.so.0 → mesa softpipe.

### 3. libglvnd + Mesa DRI Stack
- **Location:** `output/target/usr/lib/` (libOpenGL.so.0, libGLdispatch.so.0, libEGL.so.1)
- **Location:** `output/target/usr/lib/dri/` (swrast_dri.so, kms_swrast_dri.so, virtio_gpu_dri.so → libgallium-26.0.4.so)
- **Problem:** Buildroot's mesa3d package didn't install DRI drivers for Wayland-only softpipe builds, and no real GL dispatch existed
- **Fix:** Enabled BR2_PACKAGE_LIBGLVND, manually installed Mesa gallium DRI drivers with symlinks

---

## Supervisor Environment Variables (all critical for VM/QEMU boot)
```
WLR_RENDERER=pixman
WLR_NO_HARDWARE_CURSORS=1
WLR_LIBINPUT_NO_DEVICES=1
GDK_BACKEND=wayland
WEBKIT_DISABLE_COMPOSITING_MODE=1
WEBKIT_DISABLE_DMABUF_RENDERER=1
LIBGL_ALWAYS_SOFTWARE=1
GALLIUM_DRIVER=softpipe
WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1
GSK_RENDERER=cairo
```

**Cage launch command:** `cage -s -- /bin/sh -c "sleep 2 && exec /sbin/magnolia-hub"` (2s delay lets Wayland compositor stabilize)

---

## Build Environment
- **Platform:** WSL2 Ubuntu (20 cores, 20GB RAM, 8GB swap)
- **Parallelism:** JLEVEL=4 (prevents OOM — WebKitGTK cc1plus uses 2.7GB/process)
- **Memory tuning:** `vm.overcommit_memory=1`, `vm.swappiness=80`
- **Watchdog:** Cron every 5min at `/root/auto-restart.sh` auto-restarts on crash
- **Build dir:** `~/buildroot` (native ext4, not NTFS)
- **Build log:** `/root/build.log`

## Mock Data Replaced (8 of 21)
These stubs were replaced with real implementations:
1. **WiFi signal strength** — now parses `nmcli -t -f active,signal dev wifi`
2. **Hardware telemetry** — scans `/proc/<pid>/fd/` for camera, `pactl` for mic
3. **SHA256 hash** — computes real SHA256 of encrypted files
4. **Thermal monitoring** — scans all `/sys/class/thermal/thermal_zone*`
5. **Screenshot capture** — proper error instead of mock data prefix
6. **Partition detection** — parses `/proc/cmdline` + `/proc/mounts` for virtio
7. **PIN verification** — SHA256 hash against `/data/system/pin.hash` keystore
8. **Partition management** — real fsck/mount/umount operations

Remaining 13 stubs are complex features (P2P networking, Anthropic API, LLM throttling) — deferred until after boot works.

## Serial Boot Log Analysis (2026-04-13)

Full serial capture via `-nographic` confirms every stage:

```
[  2.658661] VFS: Mounted root (ext4 filesystem) on device 254:2.
[  2.751069] Run /sbin/init as init process
[Magnolia] Initializing Sovereign Supervisor (PID 1)...
[Magnolia] Launching Magnolia Dashboard Hub on Cage...
[Magnolia] Supervisor active. Monitoring Hub (PID 54)...
```

Cage initialization (via wlroots):
```
[backend/drm/backend.c:225] Initializing DRM backend for /dev/dri/card0 (virtio_gpu)
[util/env.c:25] Loading WLR_RENDERER option: pixman
[render/pixman/renderer.c:328] Creating pixman renderer
[backend/drm/drm.c:944] connector Virtual-1: Modesetting with 1280x800 @ 74.994 Hz
```

XDG surface patch working:
```
[types/xdg_shell/wlr_xdg_surface.c:171] xdg_surface configure before init — proceeding anyway
```

Magnolia Hub fully operational:
```
[Magnolia] Dashboard Hub setup complete.
[Magnolia] Storage Hub Pulse active.
[Magnolia] HAL Maintenance Pulse active.
[Magnolia] Network Lattice Pulse active.
```

## Black Screen Diagnosis

**The app is running perfectly — it's a display compositing issue, not a crash.**

What works:
- Cage modesetting at 1280x800 on Virtual-1 via virtio-gpu-pci
- XDG surface creation and configure (patch fires correctly)
- Tauri app starts, database initializes, all pulses run
- QEMU shows Cage has taken over the framebuffer (black rectangle inside QEMU chrome)

What doesn't work:
- Hub's rendered web content does not appear in the framebuffer
- Possible causes to investigate:
  1. **Wayland surface damage/commit** — WebKitGTK+Cairo may not be flushing damage to the Wayland surface
  2. **Buffer format mismatch** — Cairo software buffer format vs what pixman compositor expects
  3. **GSK_RENDERER=cairo + WEBKIT_DISABLE_COMPOSITING_MODE** — may prevent WebKitGTK from writing to the wl_surface entirely
  4. **Stub libGL intercept** — if WebKitGTK uses libGL.so.1 for actual rendering instead of just probing, the stub's noop draw calls produce black
  5. **Tauri embedded assets** — frontendDist embeds at compile time; verify cross-compile actually bundled them

## Known Issues (non-blocking)
- `/dev/vda4` and `/dev/vda5` (appdata/userdata) fail to mount — need mkfs.ext4 on first boot
- `/dev: EBUSY` on devtmpfs mount — benign, kernel already mounted it
- `lsblk not found` — storage pulse audit can't run (cosmetic)
- `nmcli not found` — WiFi scan fails gracefully (no WiFi hardware in QEMU)
- Mock stubs remain for P2P networking, Anthropic streaming, LLM memory

## QEMU Test Commands

**GUI display (via WSLg):**
```bash
export DISPLAY=:0 GDK_BACKEND=x11
cp /usr/share/OVMF/OVMF_VARS_4M.fd /root/ovmf_vars_magnolia.fd
qemu-system-x86_64 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE_4M.fd \
  -drive if=pflash,format=raw,file=/root/ovmf_vars_magnolia.fd \
  -drive file=/root/buildroot/output/images/magnolia.img,format=raw,if=virtio,cache=writeback \
  -m 2G -smp 2 \
  -device virtio-gpu-pci -device virtio-keyboard-pci -device virtio-mouse-pci \
  -display gtk -cpu qemu64 -daemonize
```

**Serial capture (headless):**
```bash
qemu-system-x86_64 [same drives] -nographic -cpu qemu64
```

## To Resume Build
```bash
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
cd ~/buildroot
make magnolia-supervisor-rebuild  # pick up source changes
make                              # regenerate magnolia.img
```

## Next Steps (Priority Order)
1. **Fix black screen** — investigate Wayland surface damage path between WebKitGTK/Cairo and Cage/pixman
2. Try removing `WEBKIT_DISABLE_COMPOSITING_MODE=1` — may be preventing surface writes
3. Try removing `GSK_RENDERER=cairo` — let GTK4 pick its own renderer
4. Add debug: simple HTML test page (solid color background) to isolate rendering vs content issue
5. Format appdata/userdata partitions on first boot
6. Replace remaining 13 mock stubs

---
*Boot chain verified end-to-end via serial log. Display rendering is the last mile. (2026-04-13)*
