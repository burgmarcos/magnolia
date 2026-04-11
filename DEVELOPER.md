# Magnolia Developer Manual: Architectural Deep Dive

This document provides a technical blueprint for the internal mechanics of Magnolia OS, intended for core developers, security auditors, and automated site-generation agents.

---

## 1. Boot Sequence & The Supervisor Handover

Magnolia does not use `systemd` or `init.d`. We utilize a custom Rust-based supervisor (`magnolia-supervisor`) as PID 1 to ensure minimal attack surface and maximum boot speed.

1. **GRUB2**: Loads the kernel and initramfs (embedded).
2. **Kernel**: Initializes VirtIO drivers (for simulation) or hardware drivers (NVMe/GPU).
3. **Supervisor (PID 1)**:
   - Mounts `/dev/vda4` as the primary persistent storage volume.
   - Sets up the `tmpfs` for `/run` and `/tmp`.
   - Handover: Spawns the `magnolia-core` binary and the `cage` compositor.

## 2. Security: The Bubblewrap Sandbox

Every application (including the Browser and Editor) runs inside a restricted namespace enforced by `bwrap`.

```rust
// Core Sandbox Logic in app_manager.rs
cmd.arg("--unshare-all")
   .arg("--share-net")
   .arg("--ro-bind").arg("/usr").arg("/usr")
   .arg("--dir").arg("/home/sandbox")
```

- **Filesystem Isolation**: Apps can only see their own `/app` directory and essential `/usr` libraries.
- **Process Isolation**: Apps cannot see or signal processes belonging to other apps or the host system.

## 3. Storage Strategy: Stage A/B Rollbacks

Magnolia ensures 100% uptime through atomic system updates.

- **VDA2 (Stage A)**: Production Root (Read-Only).
- **VDA3 (Stage B)**: Update Target (Read-Write during update).
- **Handover**: On successful update, GRUB is updated to set the default entry to the alternate stage.

## 4. AI Engine: Local-First Intelligence

The `magnolia-core` manages a background `llama-server` process.

- **Endpoint**: `http://localhost:8080/v1/chat/completions` (OpenAI Compatible).
- **Inference**: Optimized for AVX2/AVX512 and VirtIO GPU acceleration.
- **System Prompt**: Injected at the Rust layer to ensure the assistant stays within the Magnolia Knowledge Base.

---

## 5. Continuous Integration (CI/CD)

All source code is automatically verified on every push via **GitHub Actions**.
- **Action**: `magnolia_verify.yml`
- **Scope**: Lints, tests, and compiles UI, Core, and Supervisor binaries.
- **Failures**: Any "stuck" commands or syntax errors are caught here before image generation.

## 6. Portability & VM Testing

- **System Image**: `magnolia.img` (approx **4.06 GB**).
- **Safe Graphics Mode**: If you encounter a black screen in QEMU (common on laptops without GL support), run the launcher with:
  ```batch
  .\qemu-test-win.bat --safe
  ```
- **External VMs (Hyper-V/VirtualBox)**: 
  - Use **Generation 2** (UEFI).
  - Disable **Secure Boot**.
  - Point to the `.img` as a Raw Disk or convert to `VHDX`.

---

## 7. Development Quality Gates

All contributions must pass the following checks:
- **Rust**: `cargo clippy -- -D warnings`
- **UI**: `npm run lint` & `npm run test`
- **Integration**: Full `build_full_os.sh` execution.

*Magnolia OS: Building the future of Digital Sovereignty.*
