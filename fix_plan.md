1. **Analyze Security Issue**:
    - The `verify_security_action` in `magnolia-core/src/system/storage.rs` verifies a PIN by hashing it with `user_confirm` using `Sha256`.
    - `commit_identity` in `magnolia-core/src/system/api.rs` saves the PIN by writing it as plain text directly to `/data/system/pin.hash`. Oh, wait, looking at `api.rs:221`, it says: `std::fs::write("/data/system/pin.hash", pin)`. This saves the raw PIN! Wait, but in `verify_security_action`, it expects `computed_hash == stored_hash`. This suggests the `commit_identity` actually saves the raw PIN instead of a hash, and `verify_security_action` does `sha256(pin + user_confirm)` but compares it with the plain text PIN? No, `commit_identity` says `std::fs::write("/data/system/pin.hash", pin)`. If it wrote the plain PIN, then `sha256(pin + user_confirm)` would never match the plain PIN! But wait, does it write the `hash` there somewhere?
    - Let's check `commit_identity` carefully.
    - Also, `verify_security_action` should be using Argon2 instead of SHA256 for password hashing.
    - And `commit_identity` needs to use Argon2 to hash the PIN before saving it to `pin.hash`.

Wait, in `verify_security_action`:
```rust
    // SHA256(pin + user_confirm) must match stored hash
    let mut hasher = Sha256::new();
    hasher.update(pin.as_bytes());
    hasher.update(user_confirm.as_bytes());
    let computed_hash = format!("{:x}", hasher.finalize());

    if computed_hash.trim() == stored_hash.trim() {
        Ok(true)
    } else {
...
```
If `commit_identity` is storing plain text `pin`:
```rust
    std::fs::write("/data/system/pin.hash", pin).map_err(|e| e.to_string())?;
```
This is already horribly broken. The system writes `pin` but reads it as `stored_hash`, which never matches `computed_hash` unless `pin` itself was somehow already `sha256(pin + user_confirm)`. Wait, maybe `pin` passed to `commit_identity` was already hashed by the frontend? If so, the frontend is hashing it, and `commit_identity` writes it. But `verify_security_action` receives `pin` and hashes it. Let's fix this mess by implementing Argon2 password hashing on the backend.

**Plan**:
1. Import `argon2` into `src/system/api.rs` and `src/system/storage.rs`. Wait, it's better to create an auth module, or just put it in both. `argon2` crate provides `Argon2`, `PasswordHasher`, `PasswordHash`, `PasswordVerifier`, `SaltString`, etc.
2. In `commit_identity` (`src/system/api.rs`), hash the `pin` using Argon2 with a random salt before writing it to `/data/system/pin.hash`. (Note: `pin.hash` will now contain the PHC string from Argon2, which includes the salt). Also fix `identity.hash`. Wait, `identity.hash` hashes `pin` and `recovery_key`. Let's just fix `commit_identity` to use Argon2 for the PIN. Wait, if I change `commit_identity` to hash the PIN, I should also make sure `verify_security_action` uses Argon2 to verify the PIN.
3. In `verify_security_action` (`src/system/storage.rs`), read the PHC string from `/data/system/pin.hash`, parse it into a `PasswordHash`, and verify the raw `pin` against it using Argon2.

Wait, if I change `commit_identity`, maybe the frontend passes the plain PIN. Let's verify what the frontend passes.
