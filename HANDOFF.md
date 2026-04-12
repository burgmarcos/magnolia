# Magnolia OS — Handoff Status

## Current State (2026-04-12)

| Component | Status | Details |
|-----------|--------|---------|
| **CI Verification** | ✅ Green | All 3 jobs pass (UI lint+build, core clippy+check, supervisor build) |
| **CI ISO Build** | ⏸ Manual | Disabled auto-trigger, manual only via `workflow_dispatch` |
| **Local Build** | 🔨 Active | WSL2 Buildroot, 20 cores, 20GB RAM, building in tmux |
| **Website** | ✅ Live | [burgmarcos.github.io/magnolia](https://burgmarcos.github.io/magnolia/) |
| **License** | ✅ AGPL-3.0 | Switched from ISC |
| **Code Quality** | ✅ Clean | lib.rs split into 7 handler modules, dead code removed |

---

## Build Pipeline

### Local (Primary — Fastest)
```bash
# In WSL2 Ubuntu (20 cores, 20GB RAM)
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
cd ~/buildroot
make BR2_EXTERNAL=/root/magnolia/magnolia-distro magnolia_x86_64_defconfig
make BR2_EXTERNAL=/root/magnolia/magnolia-distro -j$(nproc)
```

**Important:** When syncing from Windows, fix CRLF:
```bash
find /root/magnolia/magnolia-distro -type f \( -name '*.in' -o -name '*.mk' -o -name '*.sh' -o -name '*.cfg' -o -name '*.desc' -o -name '*.config' \) -exec sed -i 's/\r$//' {} +
```

### CI (Secondary — Manual Trigger Only)
Go to Actions → "Magnolia ISO Build" → Run workflow. Includes Buildroot caching for faster rebuilds.

### Quick Test
```bash
qemu-system-x86_64 \
  -bios /usr/share/ovmf/OVMF.fd \
  -drive file=magnolia.img,format=raw,if=virtio \
  -m 4G -smp 4 -device virtio-vga \
  -device virtio-keyboard-pci -device virtio-mouse-pci \
  -serial mon:stdio
```

---

## What Was Done

### Build Fixes
- Added `libelf-dev`/`libdw-dev` for kernel objtool (`gelf.h`)
- Fixed Rust edition `2024` → `2021` in magnolia-supervisor
- Absolute symlink for `/sbin/init` → `/usr/bin/magnolia-supervisor`
- Removed duplicate interface asset install (was in both `.mk` and `post-build.sh`)
- Added `.gitattributes` to enforce LF line endings
- Slimmed defconfig: removed xorg7, RAUC, extra GPU drivers, linux-firmware
- Shrunk dev image from ~4.1GB to ~1.3GB

### Code Cleanup (PR #1)
- Split `lib.rs` from 602 → 165 lines into 7 handler modules
- Deleted orphan files: `temp.rs`, `bin/init.rs`, `App.css`
- Removed unused deps: `google-cloud-storage`, `signal-hook`
- Fixed clippy `if_same_then_else` in model assessment

### Website
- Full single-page site at `website/index.html` + `website/styles.css`
- Sections: hero, about story, features, architecture, roadmap, download, contribute
- GitHub Pages deployment via `.github/workflows/deploy-website.yml`

---

## What's Next

### Immediate (After Build Boots)
Replace 19 mock/stub implementations with real code. Priority order:
1. WiFi signal strength parsing (`system/api.rs`)
2. Thermal sensor reading (`system/hal.rs`)
3. Real SHA256 hashing (`system/sync.rs`)
4. Dynamic UID detection (`system/sandbox.rs`)
5. Model fit evaluation (`ModelsDownloader.tsx`)
6. Anthropic streaming API (`inference.rs`)

### Later
- Custom domain magnol.ia.br (DNS setup needed)
- Production defconfig with full GPU drivers, RAUC, firmware
- A/B root partition updates
- Cloud sync and P2P updates (need architecture design)

---

## Repository Structure

```
magnolia/
├── magnolia-core/          # Tauri v2 Rust backend (26 command handlers)
│   └── src/
│       ├── handlers/       # 7 domain modules (app, secrets, models, llm, knowledge, files, browser)
│       ├── system/         # 19 system modules (hal, api, sandbox, privacy, etc.)
│       └── lib.rs          # Entry point, DbState, invoke_handler registration
├── magnolia-interface/     # React 19 + TypeScript frontend (60+ components)
├── magnolia-supervisor/    # Rust PID 1 init process (static musl binary)
├── magnolia-distro/        # Buildroot external tree
│   ├── configs/            # magnolia_x86_64_defconfig
│   ├── package/            # magnolia-core, magnolia-supervisor, magnolia-interface
│   └── board/magnolia/x86_64/  # kernel config, grub config, genimage, scripts, overlay
├── website/                # magnol.ia.br static site
├── scripts/                # Build and test helpers
└── docs/                   # Architecture, features, agent handbook
```
