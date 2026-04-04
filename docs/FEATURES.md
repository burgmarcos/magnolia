# Project Features & Agent Workflow

This document tracks the current development features, milestones, and provides a framework for multi-agent concurrent development.

## Concurrent Agent Workflow (Multi-Agent Setup)

To spin up multiple conversational agents simultaneously without them stepping on each other's toes, we have divided the project into **three independent workstreams**. When you start a new conversation with an agent, assign them ONE of these roles and point them to their respective tracking section below.

### 🎨 Agent 1: Frontend UI/UX (Figma to Code)
- **Primary Directory:** `/ui`
- **MCP Use:** Uses the **Figma Dev Mode MCP Server** to read design tokens, node properties, and layouts.
- **Rules:** Focuses strictly on the visual presentation, CSS/Tailwind, frontend components, and user interactions. 
- **Prompt to start the agent:** 
  > *"You are the Frontend UI Agent. Use your Figma MCP server tools to grab the design context for [Feature/Node ID]. Build the UI components in the `/ui` directory. Read `docs/FEATURES.md` for your specific feature checklist."*

### ⚙️ Agent 2: Core Logic & Backend (Tauri / Systems)
- **Primary Directory:** `/src-tauri`
- **Rules:** Focuses strictly on Rust backend logic, OS interactions, database integrations, and exposing Tauri commands to the frontend. Should not touch UI files.
- **Prompt to start the agent:**
  > *"You are the Core Logic Agent. We are implementing [Feature]. Write the necessary Tauri commands and Rust business logic in `/src-tauri`. Read `docs/FEATURES.md` for your specific feature checklist."*

### 🏗️ Agent 3: CI/CD, Architecture & Testing
- **Primary Directory:** `/docs`, `/.github`, root config files (`package.json`, `.gitignore`)
- **Rules:** Focuses on architecture planning, GitHub actions, testing setups, environment secrets management, and cross-checking feature completeness.
- **Prompt to start the agent:**
  > *"You are the Architect Agent. Ensure our `/docs` are updated for [Feature], structure our testing framework, and make sure we adhere to `0.0.1` versioning and our open-source rules."*

---

## Feature Tracker

*Agents should mark tasks as complete `[x]` when finished.*

### 1. Scaffold Base Application
- [x] **Agent 3 (Architect):** Update `ARCHITECTURE.md` with chosen frontend framework and Rust backend layout.
- [x] **Agent 2 (Core):** Initialize Tauri and configure strictly open-source dependencies in `src-tauri/Cargo.toml`.
- [x] **Agent 1 (UI):** Connect to Figma MCP server, read core colors/typography, and establish base `styles.css`.

### 2. Main Dashboard & Navigation
- [x] **Agent 1 (UI):** Build responsive navigation menu and main layout based on Figma (Node ID: `1:7060`). 
- [x] **Agent 2 (Core):** Create a basic `invoke` command in Rust to fetch application status to ensure frontend-backend link is working.
- [x] **Agent 3 (Architect):** Document the data flow for the Dashboard in `ARCHITECTURE.md`.

### 3. LLM Engine Integration (llama.cpp)
- [x] **Agent 2 (Core):** Integrate `llama.cpp` wrapper/bindings into the Rust backend (`src-tauri`) to allow local model execution.
- [x] **Agent 2 (Core):** Define the local models directory (`~/.slai/models` or within project `app_data_dir`) and build file system tools to scan it.
- [x] **Agent 3 (Architect):** Update `ARCHITECTURE.md` showing how Tauri interfaces with `llama.cpp` and passes streams to the frontend.

### 4. Settings & Model Downloader
- [x] **Agent 1 (UI):** Build Settings UI based on Figma to manage API Keys (OpenAI, Anthropic, etc.) and Local Model paths.
- [x] **Agent 1 (UI):** Build Model Downloader UI (search, progress bars, download buttons) reading from Figma.
- [x] **Agent 2 (Core):** Create Tauri Rust commands to securely store/retrieve API Keys using a system keyring or encrypted `.env`.
- [x] **Agent 2 (Core):** Create standard HTTP download rust commands, piping progress events back to the UI.

### 5. Chat Interface (Figma Blueprint)
- [x] **Agent 1 (UI):** Use Figma MCP to generate the Chat Interface (Message bubbles, inputs, typography).
- [x] **Agent 2 (Core):** Expose Rust streaming inference commands (for both Local llama.cpp and Cloud APIs) to the React/Vue frontend.
- [x] **Agent 3 (Architect):** Verify the entire pipeline ensures data privacy (no key leaks).

### 6. Hardware Profiling & Hugging Face Hub
- [x] **Agent 2 (Core):** Integrate `sysinfo` and GPU-detection crates in Rust to profile total RAM and vRAM.
- [x] **Agent 2 (Core):** Build the Model-Fit algorithm comparing `.gguf` sizes to available hardware memory.
- [x] **Agent 1 (UI):** Build labels for HuggingFace downloads indicating `Fits Perfectly`, `Needs Offload`, or `Does Not Run`.
- [x] **Agent 2 (Core):** Integrate with Hugging Face fetching `.gguf` models directly from `huggingface.co/api`.

### 7. Chat Experience & Wiring
- [x] **Agent 1 (UI):** Use Figma MCP to generate the Chat Interface (message bubbles, inputs, typing indicators).
- [x] **Agent 1 (UI):** Wire the Model Downloader and Settings components to the Tauri backend using `invoke` and event listeners.
- [x] **Agent 2 (Core):** Expose Rust streaming inference commands (for both Local llama.cpp and Cloud APIs) to the React frontend.
- [x] **Agent 2 (Core):** Wire up the formal download mechanism for `.gguf` files with chunks and realtime progress reporting.
- [x] **Agent 3 (Architect):** Design the Chat History state management structure (React Context / Zustand vs Backend SQLite).
- [x] **Agent 3 (Architect):** Set up basic CI/CD workflow (GitHub actions) for linting frontend and running `cargo test`.

### 8. Local RAG & Knowledge Graph Initialization
- [x] **Agent 2 (Core):** Set up `rusqlite` in `src-tauri` and execute migrations for `Chats`, `Messages`, `Documents`, and graph nodes.
- [x] **Agent 2 (Core):** Build a backend indexer capable of safely parsing a target directory of `.md` files.
- [x] **Agent 1 (UI):** Build the workspace/"Knowledge" selection view where users can point the app to their local notes folder.
- [x] **Agent 3 (Architect):** Investigate integrating `sqlite-vec` or a lightweight `llama.cpp` embedding process for local RAG on the ingested `.md` files.

### 9. RAG Engine & Visual Graph
- [x] **Agent 2 (Core):** Implement `sqlite-vec` virtual tables linked via FFI to `rusqlite`.
- [x] **Agent 2 (Core):** Wire the `.md` indexing pipeline directly to an `all-MiniLM-L6-v2.gguf` embedding generator and inject vectors into the DB.
- [x] **Agent 2 (Core):** Create semantic Search/KNN Tauri commands that intercept the user's Chat Input and retrieve context chunks before generating the answer.
- [x] **Agent 1 (UI):** Build a basic interactive node graph view using D3.js or React Flow to visualize how the users' `.md` files connect in the SQLite backend.

### 10. End-to-End Integration & Application Build
- [x] **Agent 1 (UI):** Polish the final Figma UI states, adding loading skeleton UI, toaster notifications for errors, and layout tweaks.
- [x] **Agent 2 (Core):** Perform definitive error handling passes on all Tauri commands (e.g. broken SQLite migrations, missing keys, timeout handling for HuggingFace downloads).
- [x] **Agent 3 (Architect / Manager):** Coordinate final integration tests between the React frontend UI boundaries and Tauri backend logic.
- [x] **Agent 3 (Architect / Manager):** Complete the release packaging configuration (`tauri.conf.json`) and prepare the GitHub Actions workflow to publish the `0.0.1` Desktop application build executable.
### 11. Platform Validation & Linux Environment
- [x] **Agent 3 (Architect):** Create `docs/LINUX_DEV_SETUP.md` documentation for WSL2/Ubuntu testing.
- [ ] **Agent 3 (Architect):** Perform a full build verify (`npm run tauri build`) inside the WSL2 Linux environment for the `0.0.1` release.
- [ ] **Agent 2 (Core):** Verify GPU-accelerated inference with `llama.cpp` using the NVIDIA WSL2 kernel drivers.
