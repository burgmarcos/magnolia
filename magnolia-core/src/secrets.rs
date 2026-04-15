use keyring::Entry;

// Instead of relying on a real database or real keyring for tests, we should
// mock out the interface. We can define a trait or simply replace the calls during test.

// Since the application doesn't currently use a trait or dependency injection for the keyring,
// we'll inject a mock via conditional compilation but *preserve* the actual functionality of the wrapper functions.

#[cfg(not(test))]
fn set_password_impl(service: &str, key: &str) -> Result<(), String> {
    let entry = Entry::new("Magnolia_api_keys", service)
        .map_err(|e| format!("Failed to access native keyring: {}", e))?;

    entry
        .set_password(key)
        .map_err(|e| format!("Failed to save key securely: {}", e))?;

    Ok(())
}

#[cfg(not(test))]
fn get_password_impl(service: &str) -> Result<String, String> {
    let entry = Entry::new("Magnolia_api_keys", service)
        .map_err(|e| format!("Failed to access native keyring: {}", e))?;

    entry
        .get_password()
        .map_err(|e| format!("API Key not found or access denied: {}", e))
}

#[cfg(test)]
thread_local! {
    static MOCK_KEYRING: std::cell::RefCell<std::collections::HashMap<String, String>> = std::cell::RefCell::new(std::collections::HashMap::new());
}

#[cfg(test)]
fn set_password_impl(service: &str, key: &str) -> Result<(), String> {
    // In our mock, "simulate_error" will simulate an error.
    if service == "simulate_error" {
        return Err("Failed to save key securely: mock error".to_string());
    }
    MOCK_KEYRING.with(|k| {
        k.borrow_mut().insert(service.to_string(), key.to_string());
    });
    Ok(())
}

#[cfg(test)]
fn get_password_impl(service: &str) -> Result<String, String> {
    if service == "simulate_error" {
        return Err("Failed to access native keyring: mock error".to_string());
    }
    MOCK_KEYRING.with(|k| {
        if let Some(val) = k.borrow().get(service) {
            Ok(val.clone())
        } else {
            Err("API Key not found or access denied: No matching entry found in secure storage".to_string())
        }
    })
}

/// Save a secure token to the underlying OS Keychain/Credential Manager
pub fn set_api_key(service: &str, key: &str) -> Result<(), String> {
    set_password_impl(service, key)
}

/// Retrieve a secure token from the OS Keychain completely avoiding local disk
pub fn get_api_key(service: &str) -> Result<String, String> {
    get_password_impl(service)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_and_get_api_key_success() {
        let service = "test_service_for_magnolia";
        let key = "test_key_12345";

        let set_res = set_api_key(service, key);
        assert!(set_res.is_ok(), "Failed to set API key");

        let get_res = get_api_key(service);
        assert!(get_res.is_ok(), "Failed to get API key");
        assert_eq!(get_res.unwrap(), key, "Retrieved key does not match");
    }

    #[test]
    fn test_get_api_key_not_found() {
        let get_res = get_api_key("nonexistent_service");
        assert!(get_res.is_err(), "Expected error for nonexistent service API key");
        assert_eq!(
            get_res.unwrap_err(),
            "API Key not found or access denied: No matching entry found in secure storage"
        );
    }

    #[test]
    fn test_set_api_key_error() {
        let set_res = set_api_key("simulate_error", "key");
        assert!(set_res.is_err(), "Expected error for simulate_error");
        assert_eq!(set_res.unwrap_err(), "Failed to save key securely: mock error");
    }
}
