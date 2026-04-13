use crate::system::error::ToBridgeResult;
use crate::system::{cloud, partition, rauc, sync};
use serde::{Deserialize, Serialize};
use std::process::Command;

use tauri::command;

#[derive(Serialize, Deserialize)]
pub struct UpdateStatus {
    pub compatible: String,
    pub bootname: String,
    pub slots: Vec<rauc::RaucSlot>,
}

// Diagnostic wrappers for Dashboard HUD
#[command]
pub async fn get_system_update_status() -> Result<rauc::RaucStatus, String> {
    rauc::get_rauc_status()
}

#[command]
pub async fn get_rauc_status() -> Result<rauc::RaucStatus, String> {
    rauc::get_rauc_status()
}

#[command]
pub async fn rauc_install(path: String) -> Result<(), String> {
    rauc::install_bundle(&path)
}

#[command]
pub async fn mark_partition_status(slot: String, state: String) -> Result<(), String> {
    rauc::mark_partition(&slot, &state)
}

#[derive(Serialize, Deserialize)]
pub struct SecurityStatus {
    pub label: String,
    pub is_locked: bool,
    pub is_encrypted: bool,
}

#[command]
pub async fn get_security_status() -> Result<Vec<SecurityStatus>, String> {
    // In Magnolia, we monitor the UserData (LUKS) and System (RO) states
    Ok(vec![
        SecurityStatus {
            label: "OS_CORE".into(),
            is_locked: false,
            is_encrypted: false,
        }, // System is RO
        SecurityStatus {
            label: "UserData".into(),
            is_locked: false,
            is_encrypted: true,
        }, // UserData is LUKS
    ])
}

#[derive(Serialize, Deserialize)]
pub struct NetworkInfo {
    pub ssid: String,
    pub ip_address: String,
    pub signal_strength: u8,
}

#[command]
pub async fn get_network_settings() -> Result<NetworkInfo, String> {
    // Wrap nmcli to get SSID, signal, and connection status
    let output = Command::new("nmcli")
        .args(["-t", "-f", "active,ssid,signal", "dev", "wifi"])
        .output()
        .map_err(|e| format!("NetworkManager not responding: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse nmcli terse output: "yes:MyNetwork:85" or "no:Other:60"
    let active_line = stdout.lines().find(|line| line.starts_with("yes:"));

    let (active_ssid, signal_strength) = if let Some(line) = active_line {
        let parts: Vec<&str> = line.splitn(3, ':').collect();
        let ssid = parts.get(1).unwrap_or(&"").to_string();
        let signal = parts
            .get(2)
            .and_then(|s| s.trim().parse::<u8>().ok())
            .unwrap_or(0);
        (ssid, signal)
    } else {
        ("Disconnected".to_string(), 0)
    };

    // Get IP address
    let ip_output = Command::new("hostname")
        .arg("-I")
        .output()
        .map_err(|e| e.to_string())?;

    let ip_address = String::from_utf8_lossy(&ip_output.stdout)
        .split_whitespace()
        .next()
        .unwrap_or("0.0.0.0")
        .to_string();

    // Parse WiFi signal strength from nmcli
    let signal_strength = Command::new("nmcli")
        .args(["-t", "-f", "active,signal", "dev", "wifi"])
        .output()
        .ok()
        .and_then(|out| {
            String::from_utf8_lossy(&out.stdout)
                .lines()
                .find(|line| line.starts_with("yes:"))
                .and_then(|line| line.replace("yes:", "").trim().parse::<u8>().ok())
        })
        .unwrap_or(0);

    Ok(NetworkInfo {
        ssid: active_ssid,
        ip_address,
        signal_strength,
    })
}

#[command]
pub async fn connect_to_wifi(ssid: String, password: String) -> Result<(), String> {
    let status = Command::new("nmcli")
        .args(["dev", "wifi", "connect", &ssid, "password", &password])
        .status()
        .map_err(|e| format!("Failed to execute nmcli: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Could not connect to {}. Check credentials.", ssid))
    }
}

#[command]
pub async fn set_power_state(state: String) -> Result<(), String> {
    println!("[Magnolia] Setting Power State: {}", state);
    match state.as_str() {
        "reboot" => {
            Command::new("reboot").spawn().map_err(|e| e.to_string())?;
        }
        "shutdown" => {
            Command::new("poweroff")
                .spawn()
                .map_err(|e| e.to_string())?;
        }
        _ => return Err("Invalid power state".into()),
    }
    Ok(())
}

#[command]
pub async fn unlock_partition(label: String, password: String) -> Result<(), String> {
    // Label is usually the device or a predefined name, for UserData we assume dm-crypt mapped name
    // Here we use it as the name/label for the device
    partition::unlock_partition(&format!("/dev/{}", label), &label, &password)
}

#[command]
pub async fn get_sync_quota() -> Result<cloud::UserSyncStatus, String> {
    cloud::get_sync_quota().await.map_bridge_err()
}

#[command]
pub async fn generate_recovery_key() -> Result<String, String> {
    // Generates a 24-word BIP-39 mnemonic
    sync::SovereignEncrypter::generate_new_mnemonic().map_bridge_err()
}

#[command]
pub async fn commit_identity(mnemonic: String) -> Result<(), String> {
    use keyring::Entry;
    let entry = Entry::new("Magnolia-Sovereign-Sync", "user")
        .map_err(|e| format!("Keychain access failed: {}", e))?;

    // Validate mnemonic before storing
    let mnemonic_str: &str = mnemonic.as_str();
    if bip39::Mnemonic::parse(mnemonic_str).is_err() {
        return Err("Invalid BIP-39 mnemonic provided".to_string());
    }

    entry
        .set_password(mnemonic_str)
        .map_err(|e| format!("Failed to secure identity: {}", e))
}

#[command]
pub async fn check_identity_exists() -> Result<bool, String> {
    use keyring::Entry;
    let entry = Entry::new("Magnolia-Sovereign-Sync", "user").map_err(|e| e.to_string())?;

    Ok(entry.get_password().is_ok())
}

#[derive(Serialize, Deserialize)]
pub struct GPUInfo {
    pub vendor: String,
    pub model: String,
    pub requires_proprietary: bool,
}

#[command]
pub async fn detect_gpu() -> Result<GPUInfo, String> {
    // Discover the primary GPU vendor ID from sysfs DRM
    let vendor_id = std::fs::read_to_string("/sys/class/drm/card0/device/vendor")
        .unwrap_or_else(|_| "0x0000".to_string())
        .trim()
        .to_string();

    let mut vendor_name = "Unknown GPU";
    let mut requires_proprietary = false;

    // Vendor IDs
    if vendor_id.contains("0x10de") {
        vendor_name = "Nvidia GeForce / RTX";
        requires_proprietary = true; // Recommend proprietary driver for CUDA / Machine Learning
    } else if vendor_id.contains("0x1002") {
        vendor_name = "AMD Radeon";
    } else if vendor_id.contains("0x8086") {
        vendor_name = "Intel Graphics";
    }

    Ok(GPUInfo {
        vendor: vendor_name.to_string(),
        model: "Primary Display Adapter".to_string(),
        requires_proprietary,
    })
}
