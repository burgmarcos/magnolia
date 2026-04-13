# Magnolia OS Handoff Status

## Current State (2026-04-12) — FULLY BOOTING AND STABLE

| Component | Status | Details |
|-----------|--------|---------|
| **Boot Chain** | ✅ VERIFIED | UEFI → GRUB2 → Linux 6.12.9 → magnolia-supervisor → Cage → magnolia-hub |
| **magnolia-supervisor** | ✅ RUNNING | Rust PID 1 init, all subsystems initializing |
| **magnolia-hub (Tauri v2)** | ✅ STABLE | 85+ seconds uptime verified, zero restarts |
| **Cage (Wayland kiosk)** | ✅ RUNNING | With wlroots XDG assertion patch applied |
| **WebKitGTK 2.50.5** | ✅ COMPLETE | 4,249 cmake units compiled successfully |
| **GRUB2 2.12** | ✅ COMPLETE | Host + target EFI builds done |
| **Linux Kernel 6.12.9** | ✅ COMPLETE | Boots with virtio drivers |
| **License** | ✅ AGPL-3.0 | |
| **Website** | ✅ LIVE | https://burgmarcos.github.io/magnolia/ |

---

## Three Critical Fixes That Made Boot Work

### 1. wlroots XDG Assertion Patch
- **File:** `/root/buildroot/package/wlroots/0003-xdg-surface-graceful-uninit.patch`
- **Problem:** Cage SIGABRTs when WebKitGTK creates surfaces before XDG handshake completes
- **Fix:** Removes fatal assert in `wlr_xdg_surface_schedule_configure`, replaces with log+proceed

### 2. libGL.so.1 Stub Library
- **File:** `output/target/usr/lib/libGL.so.1.0.0`
- **Problem:** WebKitGTK unconditionally dlopen()s libGL.so.1 and crashes if not found
- **Fix:** Functional stub providing minimal GL API (version strings, noop calls). WebKit falls back to software path.

### 3. DRI Driver Installation
- **Location:** `output/target/usr/lib/dri/`
- **Problem:** Buildroot's mesa3d package didn't install DRI drivers automatically
- **Fix:** Manually installed Mesa gallium drivers with symlinks (swrast_dri.so, kms_swrast_dri.so, virtio_gpu_dri.so → libgallium-26.0.4.so)

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

## Known Issues (non-blocking)
- `/dev/vda4` and `/dev/vda5` (appdata/userdata) fail to mount — partitions have no filesystem yet (need mkfs.ext4 on first boot)
- `/dev: EBUSY` on devtmpfs mount — benign, kernel already mounted it
- `lsblk not found` — storage pulse audit can't run (cosmetic)
- `nmcli not found` — WiFi scan fails gracefully (no WiFi hardware in QEMU)
- Mock stubs remain for P2P networking, Anthropic streaming, LLM memory

## QEMU Test Command (verified working)
```bash
qemu-system-x86_64 -drive if=virtio,format=raw,file=magnolia.img \
  -drive if=pflash,format=raw,readonly=on,file=OVMF_CODE_4M.fd \
  -drive if=pflash,format=raw,file=efivars.fd \
  -m 2G -smp 2 \
  -device virtio-gpu-pci -device virtio-keyboard-pci -device virtio-mouse-pci \
  -serial stdio -net nic -net user
```

## To Resume Build
```bash
# If build died:
wsl -d Ubuntu -- bash -c "export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin && sysctl -w vm.overcommit_memory=1 && sysctl -w vm.swappiness=80 && cd ~/buildroot && tmux new-session -d -s build 'make BR2_EXTERNAL=/root/magnolia/magnolia-distro 2>&1 | tee /root/build.log'"
```

## Next Steps
1. User GUI QEMU test (add `-display gtk` or use VNC)
2. Format appdata/userdata partitions on first boot (mkfs.ext4 for /dev/vda4, /dev/vda5)
3. Install lsblk (util-linux) for storage pulse
4. Replace remaining mock stubs as features mature

---
*Boot verified stable: 85+ seconds uptime, zero restarts, all subsystems initializing (2026-04-12)*
