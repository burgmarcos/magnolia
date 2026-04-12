use crate::secrets;
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

const SYSTEM_PROMPT: &str = "You are the Magnolia Sovereign Assistant, the core intelligence of Magnolia OS. 
Magnolia OS is a sovereign, privacy-first operating system built on a hardened Linux kernel 6.12.9.

Key Architectural Knowledge:
1. Sovereignty: Magnolia focuses on local-first data, user-owned AI, and encrypted storage.
2. Partitioning: We use a robust Stage A/B system update strategy (partitions vda2 and vda3). 
3. User Data: Persistent user data is housed in vda4/vda5, dynamically discovered by our Rust-based supervisor (PID 1).
4. Security: Applications are sandboxed using Bubblewrap (bwrap), isolating them from the core system.
5. AI Strategy: Local LLM inference via llama-server (llama.cpp) with optional Cloud Fusion (Vertext AI/GCP) for high-compute tasks.
6. Display: We use Wayland with the Cage kiosk compositor, optimized for low-latency hub interaction.

When users ask for help or details about the system, provide accurate, helpful information based on these technical pillars. Stay professional and security-conscious.";

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

            if let Some(data) = line.strip_prefix("data: ") {
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

/// Streams a chat completion from the Anthropic Messages API.
/// Parses SSE events of type `content_block_delta` and emits `chat-token` events.
async fn stream_chat_anthropic(
    app: AppHandle,
    model: String,
    messages: Vec<ChatMessage>,
    api_key: String,
) -> Result<(), String> {
    let client = Client::new();

    // Anthropic requires a separate top-level "system" param — not in messages array
    let system_content = messages
        .iter()
        .find(|m| m.role == "system")
        .map(|m| m.content.clone())
        .unwrap_or_default();

    let user_messages: Vec<_> = messages
        .iter()
        .filter(|m| m.role != "system")
        .collect();

    let body = serde_json::json!({
        "model": model,
        "max_tokens": 2048,
        "system": system_content,
        "messages": user_messages,
        "stream": true
    });

    let res = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Anthropic request failed: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("Anthropic API error {}: {}", status, err_body));
    }

    let mut stream = res.bytes_stream();
    let mut buffer = String::new();
    let mut current_event = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(newline_idx) = buffer.find('\n') {
            let raw_line = buffer[..newline_idx].to_string();
            buffer = buffer[newline_idx + 1..].to_string();
            let line = raw_line.trim();

            if line.starts_with("event:") {
                current_event = line.trim_start_matches("event:").trim().to_string();
            } else if let Some(data) = line.strip_prefix("data:") {
                let data = data.trim();
                if data == "[DONE]" {
                    let _ = app.emit("chat-token", ChatChunk { token: String::new(), is_done: true });
                    return Ok(());
                }
                if current_event == "content_block_delta" {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(text) = json.get("delta").and_then(|d| d.get("text")).and_then(|t| t.as_str()) {
                            let _ = app.emit("chat-token", ChatChunk { token: text.to_string(), is_done: false });
                        }
                    }
                } else if current_event == "message_stop" {
                    let _ = app.emit("chat-token", ChatChunk { token: String::new(), is_done: true });
                    return Ok(());
                }
            }
        }
    }

    let _ = app.emit("chat-token", ChatChunk { token: String::new(), is_done: true });
    Ok(())
}

pub async fn stream_chat_local(
    app: AppHandle,
    mut messages: Vec<ChatMessage>,
) -> Result<(), String> {
    // Inject specialized system knowledge
    messages.insert(
        0,
        ChatMessage {
            role: "system".into(),
            content: SYSTEM_PROMPT.into(),
        },
    );

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
    let mut messages = messages;
    // Inject specialized system knowledge
    messages.insert(
        0,
        ChatMessage {
            role: "system".into(),
            content: SYSTEM_PROMPT.into(),
        },
    );

    let api_key = secrets::get_api_key(&provider)?;
    let client = Client::new();

    // Support OpenAI for now; other models can be mapped accordingly
    let url = match provider.to_lowercase().as_str() {
        "openai" => "https://api.openai.com/v1/chat/completions",
        "anthropic" => {
            return stream_chat_anthropic(app, model, messages, api_key).await;
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
