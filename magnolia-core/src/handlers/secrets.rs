use crate::secrets;

#[tauri::command]
pub fn set_api_key(service: String, key: String) -> Result<(), String> {
    secrets::set_api_key(&service, &key)
}

#[tauri::command]
pub fn get_api_key(service: String) -> Result<String, String> {
    secrets::get_api_key(&service)
}

#[tauri::command]
pub async fn verify_hf_token(token: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://huggingface.co/api/whoami-v2")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if res.status().is_success() {
        Ok("Token Validated".into())
    } else {
        Err(format!("HuggingFace rejected token: {}", res.status()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_handler_set_api_key_success() {
        let service = "test_service_for_magnolia".to_string();
        let key = "test_key_12345".to_string();
        let res = set_api_key(service, key);
        assert!(res.is_ok());
    }

    #[test]
    fn test_handler_set_api_key_error() {
        // Based on secrets.rs mock, "simulate_error" will simulate an error
        let service = "simulate_error".to_string();
        let key = "key".to_string();
        let res = set_api_key(service, key);
        assert!(res.is_err());
        assert_eq!(res.unwrap_err(), "Failed to save key securely: mock error");
    }

    #[test]
    fn test_handler_get_api_key_success() {
        let service = "test_get_service".to_string();
        let key = "test_get_key".to_string();
        let _ = set_api_key(service.clone(), key.clone());

        let res = get_api_key(service);
        assert!(res.is_ok());
        assert_eq!(res.unwrap(), key);
    }

    #[test]
    fn test_handler_get_api_key_not_found() {
        let res = get_api_key("nonexistent_service".to_string());
        assert!(res.is_err());
        assert_eq!(
            res.unwrap_err(),
            "API Key not found or access denied: No matching entry found in secure storage"
        );
    }
}
