Wait, in `SovereignOOBE.tsx` the frontend calls `commit_identity` with ONLY `mnemonic`? Let's verify Tauri argument mapping.
Tauri maps JSON `{ mnemonic: mnemonic.join(' ') }` to the command arguments.
But the Rust command has:
`pub async fn commit_identity(pin: String, recovery_key: String) -> Result<(), String>`

If the frontend passes `{ mnemonic: "..." }`, Tauri will fail to map it because `pin` and `recovery_key` are missing. Let's see if there is another `commit_identity` or if the Rust signature is different in the `tauri::Builder`?
No, the Rust file says:
`pub async fn commit_identity(pin: String, recovery_key: String) -> Result<(), String>`
Wait, is there a `commit_identity` in `magnolia-core/src/system/api.rs` that accepts `mnemonic`? No.
Maybe the code never actually compiled correctly or `commit_identity` was throwing an error?
Ah, if the frontend sends `{ mnemonic: ... }` it will throw an error `missing field pin`. Wait, let me check the frontend again to see if it sets a PIN. No, it doesn't set a PIN anywhere. Oh, maybe the user sets a PIN elsewhere? Let me check where `pin.hash` is actually used.

Let's just fix the backend. The task specifies:
> **Issue:** Weak PIN Validation in verify_security_action
> **Rationale:** While the PIN is hashed, `SHA256(pin + user_confirm)` is not a secure password hashing mechanism like Argon2 or bcrypt. It lacks a random salt (unless user_confirm is considered the salt, but it might be known) and a work factor, making brute-forcing the PIN trivial if the hash is leaked.

So I need to:
1. Change `verify_security_action` in `magnolia-core/src/system/storage.rs` to use `argon2` to verify the PIN.
2. Change `commit_identity` in `magnolia-core/src/system/api.rs` to use `argon2` to hash the PIN before storing it in `/data/system/pin.hash`.

Let's do this. If `commit_identity` signature has `pin: String, recovery_key: String`, then it does. It might be that the frontend code `SovereignOOBE.tsx` is broken and passing `{ mnemonic: ... }` but fixing the frontend is NOT strictly part of the vulnerability task, but I SHOULD fix it if I notice it. If the frontend passes `mnemonic` and it fails, it's a bug. But let's check `SovereignOOBE.tsx` again, wait, no, I only need to fix the vulnerable code and ensure tests pass.

Let's examine `commit_identity` and `verify_security_action` signatures.
