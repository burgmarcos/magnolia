#[cfg(not(test))]
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
use std::collections::HashMap;
#[cfg(test)]
use std::sync::{Mutex, OnceLock};

#[cfg(test)]
#[derive(Clone, Copy)]
enum MockFailure {
    SetPassword,
    GetPassword,
}

#[cfg(test)]
static MOCK_KEYRING: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
#[cfg(test)]
static MOCK_FAILURE: OnceLock<Mutex<Option<MockFailure>>> = OnceLock::new();

#[cfg(test)]
fn mock_keyring() -> &'static Mutex<HashMap<String, String>> {
    MOCK_KEYRING.get_or_init(|| Mutex::new(HashMap::new()))
}

#[cfg(test)]
fn mock_failure() -> &'static Mutex<Option<MockFailure>> {
    MOCK_FAILURE.get_or_init(|| Mutex::new(None))
}

#[cfg(test)]
fn set_mock_failure(failure: Option<MockFailure>) {
    *mock_failure().lock().expect("mock failure mutex poisoned") = failure;
}

#[cfg(test)]
fn reset_mock_state() {
    mock_keyring()
        .lock()
        .expect("mock keyring mutex poisoned")
        .clear();
    set_mock_failure(None);
}

#[cfg(test)]
fn set_password_impl(service: &str, key: &str) -> Result<(), String> {
    if matches!(
        *mock_failure().lock().expect("mock failure mutex poisoned"),
        Some(MockFailure::SetPassword)
    ) {
        return Err("Failed to save key securely: mock error".to_string());
    }
    mock_keyring()
        .lock()
        .expect("mock keyring mutex poisoned")
        .insert(service.to_string(), key.to_string());
    Ok(())
}

#[cfg(test)]
fn get_password_impl(service: &str) -> Result<String, String> {
    if matches!(
        *mock_failure().lock().expect("mock failure mutex poisoned"),
        Some(MockFailure::GetPassword)
    ) {
        return Err("Failed to access native keyring: mock error".to_string());
    }
    if let Some(val) = mock_keyring()
        .lock()
        .expect("mock keyring mutex poisoned")
        .get(service)
    {
        Ok(val.clone())
    } else {
        Err(
            "API Key not found or access denied: No matching entry found in secure storage"
                .to_string(),
        )
    }
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

    static TEST_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

    fn test_guard() -> std::sync::MutexGuard<'static, ()> {
        TEST_LOCK
            .get_or_init(|| Mutex::new(()))
            .lock()
            .expect("test lock mutex poisoned")
    }

    #[test]
    fn test_set_and_get_api_key_success() {
        let _guard = test_guard();
        reset_mock_state();
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
        let _guard = test_guard();
        reset_mock_state();
        let get_res = get_api_key("nonexistent_service");
        assert!(
            get_res.is_err(),
            "Expected error for nonexistent service API key"
        );
        let err = get_res.unwrap_err();
        assert!(
            err.starts_with("API Key not found or access denied:"),
            "Unexpected error prefix: {err}"
        );
        assert!(
            err.contains("No matching entry found in secure storage"),
            "Unexpected error detail: {err}"
        );
    }

    #[test]
    fn test_set_api_key_error() {
        let _guard = test_guard();
        reset_mock_state();
        set_mock_failure(Some(MockFailure::SetPassword));

        let set_res = set_api_key("test_service_for_magnolia", "key");
        assert!(set_res.is_err(), "Expected error for mocked set failure");
        let err = set_res.unwrap_err();
        assert!(
            err.starts_with("Failed to save key securely:"),
            "Unexpected error prefix: {err}"
        );
        assert!(err.contains("mock error"), "Unexpected error detail: {err}");
    }

    #[test]
    fn test_get_api_key_keyring_error() {
        let _guard = test_guard();
        reset_mock_state();
        set_mock_failure(Some(MockFailure::GetPassword));

        let get_res = get_api_key("test_service_for_magnolia");
        assert!(get_res.is_err(), "Expected error for mocked get failure");
        let err = get_res.unwrap_err();
        assert!(
            err.starts_with("Failed to access native keyring:"),
            "Unexpected error prefix: {err}"
        );
        assert!(err.contains("mock error"), "Unexpected error detail: {err}");
    }
}
