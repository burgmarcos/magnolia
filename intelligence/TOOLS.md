# TOOLS.md - Magnolia Assistant Tool Conventions

## Build Orchestration
- Use `.\build.bat --core` for incremental supervisor updates.
- Use `.\build.bat --iso` for final GPT image assembly.
- **Note:** Never run `make distclean` unless a total environment corruption is suspected.

## App Management
- Apps must be provisioned via `download_app` and launched via `launch_app`.
- Always verify the `.bos` manifest before initializing a sandbox.

## Memory Palace (ChromaDB)
- Verbatim storage is preferred over summarization (MemPalace pattern).
- Use `wings/projects/` for current coding tasks.
- Use `wings/identity/` for user preferences and "Quiet Time" settings.

## Security
- Always use the `age` engine for syncing folders to the cloud.
- Never store raw BIP-39 mnemonics; use the `Identity` bridge.
