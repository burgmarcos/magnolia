use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Debug)]
pub struct RaucStatus {
    pub compatible: String,
    pub variant: String,
    pub bootname: String,
    pub slots: Vec<RaucSlot>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RaucSlot {
    pub name: String,
    pub class: String,
    pub device: String,
    pub bootname: String,
    pub state: String,
    pub boot_status: String,
}

pub fn get_rauc_status() -> Result<RaucStatus, String> {
    let output = Command::new("rauc")
        .args(["status", "--format=json"])
        .output()
        .map_err(|e| format!("Failed to execute rauc: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let status: RaucStatus = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse rauc status: {}", e))?;

    Ok(status)
}

pub fn install_bundle(path: &str) -> Result<(), String> {
    println!("[Magnolia] Installing RAUC bundle: {}", path);
    let status = Command::new("rauc")
        .args(["install", path])
        .status()
        .map_err(|e| format!("Failed to execute rauc install: {}", e))?;

    if !status.success() {
        return Err("RAUC installation failed".into());
    }

    Ok(())
}

pub fn mark_partition(slot: &str, state: &str) -> Result<(), String> {
    println!("[Magnolia] Marking slot {} as {}", slot, state);
    let status = Command::new("rauc")
        .args(["status", &format!("mark-{}", state), slot])
        .status()
        .map_err(|e| format!("Failed to mark slot: {}", e))?;

    if !status.success() {
        return Err(format!("Failed to mark slot {} as {}", slot, state));
    }

    Ok(())
}
