use crate::secrets;
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize, Deserialize)]
pub struct ChatChunk {
    pub token: String,
    pub is_done: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize)]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
}

/// A robust manual Server-Sent Events (SSE) stream parser.
/// It accumulates chunks of bytes into a string buffer and processes full lines.
async fn process_sse_stream(
    app: &AppHandle,
    mut stream: impl futures_util::Stream<Item = reqwest::Result<bytes::Bytes>> + Unpin,
) -> Result<(), String> {
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e: reqwest::Error| format!("Stream error: {}", e))?;

        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        // Process complete lines
        while let Some(newline_idx) = buffer.find('\n') {
            let line = buffer[..newline_idx].trim().to_string();
            buffer = buffer[newline_idx + 1..].to_string(); // Keep the remainder

            if line.starts_with("data: ") {
                let data = &line[6..];

                if data == "[DONE]" {
                    let _ = app.emit(
                        "chat-token",
                        ChatChunk {
                            token: String::new(),
                            is_done: true,
                        },
                    );
                    return Ok(());
                }

                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(choices) = json.get("choices") {
                        if let Some(choice) = choices.get(0) {
                            if let Some(delta) = choice.get("delta") {
                                if let Some(content) = delta.get("content") {
                                    if let Some(content_str) = content.as_str() {
                                        let _ = app.emit(
                                            "chat-token",
                                            ChatChunk {
                                                token: content_str.to_string(),
                                                is_done: false,
                                            },
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

pub async fn stream_chat_local(app: AppHandle, messages: Vec<ChatMessage>) -> Result<(), String> {
    let client = Client::new();
    let request_body = ChatRequest {
        messages,
        stream: true,
    };

    // Default endpoint for typical llama-server (llama.cpp)
    let url = "http://127.0.0.1:8080/v1/chat/completions";

    let res = client
        .post(url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to local llama engine: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Engine error: {}", res.status()));
    }

    let stream = res.bytes_stream();
    process_sse_stream(&app, stream).await?;

    Ok(())
}

pub async fn stream_chat_cloud(
    app: AppHandle,
    provider: String,
    model: String,
    messages: Vec<ChatMessage>,
) -> Result<(), String> {
    let api_key = secrets::get_api_key(&provider)?;
    let client = Client::new();

    // Support OpenAI for now; other models can be mapped accordingly
    let url = match provider.to_lowercase().as_str() {
        "openai" => "https://api.openai.com/v1/chat/completions",
        "anthropic" => {
            // Anthropic stream API is slightly different (Messages API vs Completions),
            // but we'll leave it simple for now or enforce openai compatibility.
            // As a placeholder, we map it, though Anthropic API requires different format.
            return Err(
                "Anthropic native streaming not fully implemented yet, use OpenAI interface."
                    .into(),
            );
        }
        _ => return Err("Unsupported cloud provider".to_string()),
    };

    let res = client
        .post(url)
        .bearer_auth(api_key)
        .json(&serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": true
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Cloud API error: {}", res.status()));
    }

    let stream = res.bytes_stream();
    process_sse_stream(&app, stream).await?;

    Ok(())
}
