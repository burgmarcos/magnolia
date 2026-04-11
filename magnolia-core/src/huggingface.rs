use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HfModelInfo {
    pub id: String,
    pub size_on_disk_bytes: u64,
}

/// A basic client to search for a specific model ID (e.g. "meta-llama/Meta-Llama-3-8B-Instruct")
/// and fetch its properties via the HF tree API.
pub async fn fetch_hf_model_size(
    model_id: &str,
    token: Option<String>,
) -> Result<HfModelInfo, String> {
    let client = Client::new();
    let url = format!("https://huggingface.co/api/models/{}", model_id);

    let mut request = client.get(&url)
        .header("User-Agent", "Magnolia-desktop-v0.0.2"); // Standard UA for HF

    if let Some(ref t) = token {
        let trimmed_token = t.trim();
        if !trimmed_token.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", trimmed_token));
        }
    }

    let res = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch HF API: {}", e))?;

    if !res.status().is_success() {
        if res.status() == 401 {
            return Err("Search failed: HF API returned status: 401 Unauthorized. Please ensure your token is set in settings and the model is accessible.".to_string());
        }
        return Err(format!("HF API returned status: {}", res.status()));
    }

    // The HF REST API provides a `siblings` array containing files, but getting exact total size
    // is often done by grabbing the `safetensors` index or querying the tree structure.
    // For simplicity, HF API occasionally returns siblings. We will attempt to sum `.gguf` files.

    #[derive(Deserialize)]
    struct HfSibling {
        rfilename: String,
    }

    #[derive(Deserialize)]
    struct HfModelResponse {
        siblings: Option<Vec<HfSibling>>,
    }

    let model_data: HfModelResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut total_gguf_size: u64 = 0;

    if let Some(siblings) = model_data.siblings {
        for sib in siblings {
            if sib.rfilename.ends_with(".gguf") {
                // To get actual file sizes we usually need to query the tree endpoint:
                // https://huggingface.co/api/models/{model_id}/tree/main/{rfilename}
                // For performance, we'll fetch the individual file size directly using a HEAD request to the LFS resolution
                let file_url = format!(
                    "https://huggingface.co/{}/resolve/main/{}",
                    model_id, sib.rfilename
                );
                
                let mut head_req = client.head(&file_url);
                if let Some(ref t) = token {
                    head_req = head_req.header("Authorization", format!("Bearer {}", t));
                }

                if let Ok(head_res) = head_req.send().await {
                    if let Some(len) = head_res.content_length() {
                        total_gguf_size += len;
                    }
                }
            }
        }
    }

    if total_gguf_size == 0 {
        return Err("No .gguf files or computable size found for this model.".to_string());
    }

    Ok(HfModelInfo {
        id: model_id.to_string(),
        size_on_disk_bytes: total_gguf_size,
    })
}
