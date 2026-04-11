use keyring::Entry;

/// Save a secure token to the underlying OS Keychain/Credential Manager
pub fn set_api_key(service: &str, key: &str) -> Result<(), String> {
    let entry = Entry::new("Magnolia_api_keys", service)
        .map_err(|e| format!("Failed to access native keyring: {}", e))?;

    entry
        .set_password(key)
        .map_err(|e| format!("Failed to save key securely: {}", e))?;

    Ok(())
}

/// Retrieve a secure token from the OS Keychain completely avoiding local disk
pub fn get_api_key(service: &str) -> Result<String, String> {
    let entry = Entry::new("Magnolia_api_keys", service)
        .map_err(|e| format!("Failed to access native keyring: {}", e))?;

    entry
        .get_password()
        .map_err(|e| format!("API Key not found or access denied: {}", e))
}
