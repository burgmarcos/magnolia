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
