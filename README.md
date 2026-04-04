<div align="center">
  <img src="slai.png" alt="SLAI Logo" width="400">
  <br />
  <h1>SLAI ✨</h1>
  <p><b>Seamless Local AI (Slay + AI)</b></p>
  <p><i>The high-performance, local-first AI engine for Windows.</i></p>

  <p>
    <a href="https://github.com/burgmarcos/slai/releases/latest">
      <img src="https://img.shields.io/github/v/release/burgmarcos/slai?style=flat-square&color=pink" alt="Version" />
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/burgmarcos/slai?style=flat-square&color=pink" alt="License" />
    </a>
    <a href="https://buymeacoffee.com/burgmarcos">
      <img src="https://img.shields.io/badge/Support-Buy%20Me%20A%20Coffee-orange?style=flat-square&logo=buy-me-a-coffee" alt="Buy Me A Coffee" />
    </a>
  </p>
</div>

---

## ✨ The Vibe

SLAI was **vibecoded** from scratch. 

After more than 9 frustrated attempts to get *OpenClaw* to behave as expected, we realized that fixing something broken often takes more time than building something better. SLAI is the result of that realization—a clean, modular, and satisfyingly fast desktop AI experience that actually works the way you want it to.

It's "Slay" meet "AI"—modern, premium, and built for those who value privacy without sacrificing the "sparkle."

## 🚀 Key Features

### 🧠 Local LLM Engine
No cloud, no subscriptions, no data leaks. Powered by `llama.cpp`, SLAI runs `.gguf` models directly on your hardware with high-performance streaming.

### 📚 Semantic RAG (Retrieval-Augmented Generation)
Transform your local `.md` notes into a personal knowledge base. Using `sqlite-vec` and `all-MiniLM-L6-v2`, SLAI indexes your workspace so your AI actually knows what you're talking about.

### ⚡ Hardware Fit Profiling
Wondering if a 70B model will run on your laptop? SLAI profiles your CPU, GPU, and VRAM in real-time to give you clear indicators: **"Fits Perfectly,"** **"Needs Offload,"** or **"Does Not Run."**

### 📥 One-Click Model Hub
A curated explorer for the Hugging Face Hub. Search, profile, and download your favorite models with integrated progress tracking.

---

## 💻 Getting Started

### Windows (Primary Support)
1. Download the latest `.msi` or `.exe` from the [Releases](https://github.com/burgmarcos/slai/releases).
2. Run the installer.
3. **Note:** Since the build is currently unsigned, Windows SmartScreen may show a warning. Click **"More Info"** -> **"Run Anyway"** to slay.

### macOS
Support is coming soon! Check the [Roadmap](#-roadmap) for updates.

---

## 🏗️ Architecture

SLAI follows a strictly separated, multi-agent friendly architecture:
- **Backend (Rust/Tauri):** High-performance systems logic and local-first persistence via SQLite.
- **Frontend (React/Vite):** A premium, glassmorphic UI built with Vanilla CSS Modules.
- **Search (sqlite-vec):** Lightning-fast vector embeddings stored right alongside your messages.

For more details, see [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [FEATURES.md](docs/FEATURES.md).

---

## 🗺️ Roadmap
- [ ] **macOS Support**: Bringing the slay to Apple Silicon.
- [ ] **Knowledge Graphs**: Visualizing how your thoughts connect in SQLite.
- [ ] **Advanced RAG**: Multi-document support and PDF ingestion.
- [ ] **Plugin System**: Modular extensions for custom tool-use.

---

## ☕ Support the Project

If SLAI helps you slay your daily tasks, consider supporting the development!

<a href="https://buymeacoffee.com/burgmarcos">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="160">
</a>

---

<div align="center">
  <p>Built with ❤️ and a lot of vibes.</p>
</div>
