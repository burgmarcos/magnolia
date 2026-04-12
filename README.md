<p align="center">
  <img src="https://raw.githubusercontent.com/burgmarcos/magnolia/main/magnolia-distro/board/magnolia/x86_64/grub-theme/background.png" width="120" alt="Magnolia OS">
</p>

<h1 align="center">Magnolia OS</h1>
<p align="center"><strong>The Sovereign Intelligent Workspace</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-green.svg" alt="License">
  <img src="https://img.shields.io/badge/kernel-Linux%206.12.9-orange.svg" alt="Kernel">
  <img src="https://img.shields.io/badge/runtime-Rust%202021%20%2B%20React%2019-blue.svg" alt="Runtime">
  <img src="https://img.shields.io/badge/status-dev--build-yellow.svg" alt="Status">
  <a href="https://burgmarcos.github.io/magnolia/"><img src="https://img.shields.io/badge/website-magnol.ia.br-purple.svg" alt="Website"></a>
  <a href="https://buymeacoffee.com/burgmarcos"><img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg" alt="Buy Me A Coffee"></a>
</p>

<p align="center">
  <em>"Computed in Private. Verified by You. Sovereign by Design."</em>
</p>

---

A privacy-first operating system with built-in AI intelligence, built on hardened Linux. No telemetry. No surveillance. Every AI model runs locally. Every byte of your data stays yours.

## Architecture

```
UEFI Firmware
  └─ GRUB2 EFI (themed bootloader)
       └─ Linux Kernel 6.12.9 (hardened, VirtIO, DRM)
            └─ Magnolia Supervisor (Rust PID 1, static musl binary)
                 ├─ Partition Discovery (udev, mount vda4/vda5)
                 └─ Cage (Wayland kiosk compositor)
                      └─ Magnolia Hub (Tauri v2 + React 19)
                           ├─ Local AI (llama.cpp inference)
                           ├─ MemPalace (RAG search, sqlite-vec)
                           ├─ File Manager
                           ├─ Sandboxed Browser (Bubblewrap + WebKit)
                           └─ System Settings
```

## Features

| Feature | Status | Stack |
|:--------|:-------|:------|
| Wayland-native desktop | Stable | Cage + WebKitGTK + Tauri |
| Local LLM inference | Stable | llama.cpp, GGUF models |
| App sandboxing | Stable | Bubblewrap namespaces |
| MemPalace search | Stable | sqlite-vec, local embeddings |
| i18n (EN, PT-BR, ES) | Stable | JSON locale hot-swap |
| HuggingFace model browser | Stable | API + hardware fit assessment |
| Secure keyring | Stable | OS-level credential storage |
| A/B root updates | Alpha | GRUB + GPT dual-root |
| Cloud Fusion | Alpha | GCP / Vertex AI |
| P2P update mesh | Planned | mDNS + chunk transfer |

## Quick Start

### Build from Source (Windows + WSL2)

```bash
# Clone
git clone https://github.com/burgmarcos/magnolia.git
cd magnolia

# Option A: Full OS image via build script
.\build.bat

# Option B: Direct Buildroot (faster, requires WSL2 Ubuntu)
# See HANDOFF.md for full local build instructions
```

### Test in QEMU

```bash
qemu-system-x86_64 \
  -bios /usr/share/ovmf/OVMF.fd \
  -drive file=magnolia.img,format=raw,if=virtio \
  -m 4G -smp 4 -device virtio-vga \
  -device virtio-keyboard-pci -device virtio-mouse-pci \
  -serial mon:stdio
```

### Bare Metal

Flash `magnolia.img` to a USB 3.0+ drive. Boot via UEFI.

## Repository Structure

```
magnolia/
├── magnolia-core/           Tauri v2 Rust backend
│   └── src/handlers/        7 domain modules (app, models, llm, knowledge, files, secrets, browser)
│   └── src/system/          19 system modules (hal, api, sandbox, privacy, sync, etc.)
├── magnolia-interface/      React 19 + TypeScript frontend (60+ components)
├── magnolia-supervisor/     Rust PID 1 init process
├── magnolia-distro/         Buildroot external tree
│   ├── configs/             defconfig for x86_64
│   ├── package/             Custom Buildroot packages
│   └── board/magnolia/      Kernel config, GRUB, genimage, rootfs overlay
├── website/                 magnol.ia.br static site
├── scripts/                 Build and test automation
└── docs/                    Architecture, features, agent handbook
```

## Contributing

Magnolia is open source under **AGPL-3.0** and welcomes contributors.

- **Code**: Fork, pick an issue, submit a PR. CI enforces `cargo clippy` and `npm run lint`.
- **Test**: Boot the image in QEMU, file bugs, help reach hardware parity.
- **Translate**: Help bring Magnolia to more languages.

See the [Agent Handbook](docs/AGENT_HANDBOOK.md) for AI developer integration.

## Support

Magnolia OS is built in spare time by [Marcos Burg](https://mrburg.com.br), a teacher based in Brazil who was tired of open-source operating systems not working the way they should — so he decided to build an entire OS from scratch.

<p align="center">
  <a href="https://buymeacoffee.com/burgmarcos">
    <img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee">
  </a>
</p>

---

<p align="center">
  <a href="https://github.com/burgmarcos/magnolia">GitHub</a> &middot;
  <a href="https://burgmarcos.github.io/magnolia/">Website</a> &middot;
  <a href="https://mrburg.com.br">Creator</a>
</p>
