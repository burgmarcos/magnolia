# Linux Development Setup (WSL2 + Windows 11)

This guide provides the necessary steps to set up a Linux environment for developing and testing Magnolia, specifically using **WSL2** on Windows 11 with **NVIDIA GPU** acceleration.

## 1. Enable WSL2 and Install Ubuntu
If you haven't already enabled WSL2, run the following in **PowerShell as Administrator**:

```powershell
wsl --install -d Ubuntu
```

Once installed, restart if prompted and complete the Ubuntu initial setup (username/password).

## 2. Install System Dependencies
Tauri requires several system libraries to build and render the UI on Linux. Run the following in your Ubuntu terminal:

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  pkg-config
```

## 3. Install Rust Toolchain
Rust is the core engine for Magnolia's backend.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Follow the prompt (default installation is usually best)
source "$HOME/.cargo/env"
```

## 4. Install Node.js (via NVM)
We recommend using **NVM** to manage Node.js versions.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Restart your terminal or source your profile
source ~/.bashrc
nvm install --lts
```

## 5. GPU Acceleration (NVIDIA)
On Windows 11, WSL2 automatically inherits the NVIDIA drivers from the host. Verify that your GPU is reachable from within Ubuntu:

```bash
nvidia-smi
```

If you see your GPU listed, the `llama.cpp` backend in Magnolia will be able to utilize CUDA for hardware-accelerated inference.

## 6. Running Magnolia in WSL2
To run the application in development mode with a live GUI (via WSLg):

1. **Clone the repository** (if not already done inside WSL):
   ```bash
   git clone <repo-url>
   cd Magnolia
   ```
2. **Install frontend dependencies**:
   ```bash
   npm install
   ```
3. **Run the development server**:
   ```bash
   npm run tauri dev
   ```

> [!TIP]
> **WSLg Support**: Windows 11 supports WSLg by default. The Magnolia application window will appear on your Windows desktop just like a native Windows application, but it will be running inside the Linux kernel.

## 7. Troubleshooting

### "The system cannot find the file specified" (WSL Install Error)
If `wsl --install` fails with this error, it usually means the WSL background components are not enabled or were moved to a different drive. Follow these steps:

1. **Enable Features manually**: Open PowerShell as Administrator and run:
   ```powershell
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
2. **Restart your computer**.
3. **Check Storage Settings**: Go to **Settings > System > Storage > Advanced storage settings > Where new content is saved**. Ensure "New apps will save to" is set to your **C: drive**.
4. **Update WSL**: Run `wsl --update` in PowerShell.

- **Missing `webkit2gtk`**: Ensure you installed `libwebkit2gtk-4.0-dev`. Some newer distros might use `4.1`, but Tauri typically targets `4.0` or `4.1` depending on the version.
- **Slow Compilation**: Building in WSL is significantly faster if the project files are located on the Linux filesystem (e.g., `~/projects/Magnolia`) rather than a Windows mount (e.g., `/mnt/c/...`).
