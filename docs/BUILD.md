# Building Magnolia OS

This document is the canonical runbook for producing `magnolia.img` from a clean checkout. It captures the lessons from the first end-to-end build (16 rounds of debugging on Windows + WSL2).

The high-level flow is:

```
Windows host  →  WSL2 (Ubuntu 24.04 LTS)  →  scripts/build_full_os.sh
                                                ├─ Phase 0: apt deps + rustup + Node
                                                ├─ Phase 1: magnolia-interface (Vite)
                                                ├─ Phase 2: magnolia-core (cargo, host)
                                                ├─ Phase 2.5: magnolia-supervisor (cargo, musl)
                                                └─ Phase 3: Buildroot OS image
                                                              ├─ host-rust + host-librsvg + host-* tools
                                                              ├─ WebKitGTK 2.52 (long pole, ~30–60 min cold)
                                                              ├─ Linux kernel 6.12
                                                              └─ rootfs + GPT image  →  magnolia.img
```

## Prerequisites

- **Windows 10/11** with virtualization enabled in BIOS
- **WSL2** with **Ubuntu 24.04 LTS**
- **≥ 16 GB RAM** on the host (we cap WSL at 14–18 GB during the build)
- **~50 GB free disk** for the buildroot output tree
- The `burgm`-equivalent user inside WSL must be `root` for the build (Buildroot host-side packages assume root)

## One-time setup on a fresh build host

### 1. WSL configuration (`%USERPROFILE%\.wslconfig` on Windows)

```ini
[wsl2]
memory=18GB
swap=8GB
processors=8
vmIdleTimeout=-1
```

After saving, run `wsl --shutdown` from PowerShell.

### 2. WSL bootstrap (one-shot, inside WSL as root)

```bash
sudo bash scripts/wsl-bootstrap.sh
```

This script:

- Writes `/etc/wsl.conf` to **disable Windows PATH interop** (`appendWindowsPath = false`). Buildroot rejects PATHs containing spaces, and Windows interop appends paths like `/mnt/c/Program Files/...`. Without this, Phase 3 silently fails after `make olddefconfig`.
- Installs a `/usr/local/bin/wget` shim that adds `--read-timeout=60 --tries=5`. Buildroot's default invocation has `--connect-timeout=10` but no read timeout; if a GNU mirror accepts the connection then stalls mid-transfer (which `ftpmirror.gnu.org` does occasionally), the build hangs forever.

After running it, do `wsl --shutdown` from PowerShell so `/etc/wsl.conf` takes effect, then re-enter WSL.

### 3. Disable Windows sleep on AC (PowerShell as admin)

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change disk-timeout-ac    0
powercfg /change hibernate-timeout-ac 0
```

A long build (cold ~2 h) needs the box awake.

## Running a build

From the project root inside WSL:

```bash
sudo ./scripts/build_full_os.sh         # full build
sudo ./scripts/build_full_os.sh --ui    # interface only
sudo ./scripts/build_full_os.sh --core  # core + supervisor
sudo ./scripts/build_full_os.sh --iso   # buildroot/OS image only
```

`build_full_os.sh` handles, in order:

1. **Phase 0** — installs apt deps, NodeSource Node 20, rustup with pinned **1.88.0** toolchain. Idempotent.
2. **Phase 1** — `npm run build` for `magnolia-interface` → emits `dist/`.
3. **Phase 2/2.5** — `cargo build --release` for `magnolia-core` (gnu) and `magnolia-supervisor` (musl, fully static for PID 1).
4. **Phase 3** — `git clone buildroot.git` (first run only), apply `magnolia_x86_64_defconfig`, then `make -j4`. Builds the host toolchain, librsvg, WebKitGTK, the Linux kernel, and finally the rootfs + GPT disk image.

The completed image is written to `./magnolia.img` (~1.4 GB).

## Tunables

- **`BR2_JLEVEL`** in `magnolia-distro/configs/magnolia_x86_64_defconfig` controls per-package parallelism. WebKit's unified-source build can use 2–3 GB per parallel job — keep this at `4` or below on hosts with `<24 GB` RAM. Setting it to `0` (auto = `nproc`) is what was OOM-killing WSL on 14 GB caps.
- **`RUSTUP_TOOLCHAIN_VERSION`** at the top of `build_full_os.sh`. We're pinned to 1.88.0 because magnolia-core's deps (`darling 0.23`, `serde_with 3.18`, `time 0.3.47`, `icu_*`) require >= 1.88. Don't bump without verifying that Buildroot's `host-librsvg-2.50.9` still compiles — newer rustc had an ICE in `rsvg_internals/src/allowed_url.rs` (`library/alloc/src/vec/mod.rs:2873:36`).

## Flashing the image

```bash
# From WSL or any Linux:
sudo dd if=magnolia.img of=/dev/sdX bs=4M status=progress conv=fsync
```

Replace `/dev/sdX` with the target USB device — `lsblk` to find it. Or use Rufus / balenaEtcher on Windows.

The image is GPT-partitioned with EFI boot, ext4 rootfs, appdata, and userdata partitions — boot directly off the USB.

## Known issues / follow-ups

- **`host-librsvg-2.50.9` and rustc**: librsvg 2.50.9 (Sept 2021) trips a rustc ICE on >= 1.94. We currently work around by pinning host-rust to 1.88. A cleaner fix is to swap `host-librsvg` for the Ubuntu-packaged `librsvg2-bin` (provides `rsvg-convert`) at host build time. Tracked separately.
- **Cold build is ~2 h**, dominated by WebKitGTK. Subsequent builds use Buildroot's incremental stamps and are minutes.
- **`build.log` and `build-stdout.log`** lack timestamps. A small wrapper (`ts` from `moreutils` piped through `tee`) would make post-mortems easier.
