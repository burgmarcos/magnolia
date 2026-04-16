Ah, in `SovereignOOBE.tsx`:
```tsx
      await invoke('commit_identity', { mnemonic: mnemonic.join(' ') });
```
Wait, the signature of `commit_identity` in Rust is:
```rust
pub async fn commit_identity(pin: String, recovery_key: String) -> Result<(), String> {
```
The frontend calls `commit_identity` with ONLY `mnemonic` instead of `pin` and `recovery_key`? This means either `mnemonic` is passed as `pin` by accident (because argument matching is based on name), but wait, Tauri matches arguments by name! If the frontend calls `{ mnemonic: mnemonic.join(' ') }` but Rust expects `pin` and `recovery_key`, how does it even compile/run? Wait, the frontend is wrong? Let's check `SovereignOOBE.tsx` more closely.
