use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

/// The .bos manifest format for Sovereign apps.
/// Defines metadata and runtime requirements.
#[derive(Debug, Serialize, Deserialize)]
pub struct AppManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub entrypoint: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub env_vars: HashMap<String, String>,
}

const APPS_ROOT: &str = "/data/apps";

/// Fetches a verified application package and stores it in the persistent apps partition.
#[tauri::command]
pub async fn download_app(url: String, app_id: String) -> Result<String, String> {
    let app_dir = PathBuf::from(APPS_ROOT).join(&app_id);

    // Ensure the persistent apps directory exists
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app partition directory: {}", e))?;
    }

    println!(
        "[Magnolia AppManager] Fetching package for {} from {}",
        app_id, url
    );

    // Perform the download using reqwest
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Connection error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Registry returned error: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to stream package: {}", e))?;

    // In Magnolia, we usually expect a .tar.gz or similar.
    // For this implementation, we save the blob and assume the manifest is extracted.
    let target_path = app_dir.join(format!("{}.pkg", app_id));
    fs::write(&target_path, bytes).map_err(|e| format!("Disk write error: {}", e))?;

    // Extraction logic: Actually unpack the package (tar) to extract the manifest
    println!("[Magnolia AppManager] Extracting payload for verification...");
    let status = Command::new("tar")
        .args([
            "-zxf",
            &target_path.to_string_lossy(),
            "-C",
            &app_dir.to_string_lossy(),
        ])
        .status()
        .map_err(|e| format!("Extraction failed (tar not found?): {}", e))?;

    if !status.success() {
        return Err("Failed to extract application package".into());
    }

    let manifest_path = app_dir.join("manifest.bos");

    // Verification step (Check for manifest presence)
    if !manifest_path.exists() {
        return Err("Package rejected: Missing manifest.bos (Security Non-Compliance)".into());
    }

    Ok(format!(
        "App {} successfully provisioned to {}",
        app_id, APPS_ROOT
    ))
}

/// Initializes a Bubblewrap sandbox for the targeted app.
/// Enforces environment isolation and minimal filesystem visibility.
#[tauri::command]
pub fn launch_app(app_id: String) -> Result<(), String> {
    let app_dir = PathBuf::from(APPS_ROOT).join(&app_id);
    let manifest_path = app_dir.join("manifest.bos");

    if !manifest_path.exists() {
        return Err(format!(
            "Application '{}' is not installed correctly (Missing Manifest)",
            app_id
        ));
    }

    let manifest_content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read app manifest: {}", e))?;

    let manifest: AppManifest = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Corrupt manifest file: {}", e))?;

    let mut cmd = Command::new("bwrap");

    // 1. Core Sandbox Flags
    cmd.arg("--unshare-all") // Isolate PID, IPC, UTS, and Network (unless shared)
        .arg("--share-net") // Most apps need internet
        .arg("--new-session")
        .arg("--die-with-parent");

    // 2. Read-Only System Bindings
    // Only bind the absolute essentials for a functional Linux environment
    cmd.arg("--ro-bind")
        .arg("/usr")
        .arg("/usr")
        .arg("--ro-bind")
        .arg("/lib")
        .arg("/lib")
        .arg("--ro-bind")
        .arg("/lib64")
        .arg("/lib64")
        .arg("--ro-bind")
        .arg("/bin")
        .arg("/bin")
        .arg("--ro-bind")
        .arg("/sbin")
        .arg("/sbin");

    // 3. System Interfaces
    cmd.arg("--proc")
        .arg("/proc")
        .arg("--dev")
        .arg("/dev")
        .arg("--tmpfs")
        .arg("/run");

    // 4. Application Sandboxing
    // Bind the app directory as the root for the application workspace
    cmd.arg("--ro-bind").arg(&app_dir).arg("/app");

    // 5. Ephemeral User Home
    cmd.arg("--dir")
        .arg("/home/sandbox")
        .arg("--setenv")
        .arg("HOME")
        .arg("/home/sandbox");

    // 6. Environment Variable Isolation
    // We clear the environment to prevent leakage from the Core OS
    cmd.env_clear();

    // Inject safe defaults
    cmd.env("PATH", "/usr/bin:/bin:/app/bin");
    cmd.env("TERM", "xterm-256color");

    // Inject variables defined specifically in the .bos manifest
    for (key, value) in &manifest.env_vars {
        cmd.env(key, value);
    }

    // 7. GPU & Display Passthrough (If available)
    if let Ok(runtime_dir) = env::var("XDG_RUNTIME_DIR") {
        cmd.arg("--bind").arg(&runtime_dir).arg(&runtime_dir);
        cmd.env("XDG_RUNTIME_DIR", &runtime_dir);
    }

    // DRM for hardware acceleration
    if PathBuf::from("/dev/dri").exists() {
        cmd.arg("--dev-bind").arg("/dev/dri").arg("/dev/dri");
    }

    // 8. Execution Execution
    let entry_target = format!("/app/{}", manifest.entrypoint);
    cmd.arg(&entry_target);

    println!(
        "[Magnolia] Sandboxing App [{}] -> Entry: {}",
        manifest.name, entry_target
    );

    cmd.spawn()
        .map_err(|e| format!("Failed to initialize Bubblewrap sandbox: {}", e))?;

    Ok(())
}
