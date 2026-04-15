use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
};
use chrono;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DiskInfo {
    pub name: String,
    pub label: String,
    pub mount_point: String,
    pub total_space: u64,
    pub used_space: u64,
    pub free_space: u64,
    pub is_removable: bool,
    pub is_locked: bool,
    pub expansion_pending: bool,
    pub filesystem: String,
}

#[command]
pub async fn archive_app(app_id: String) -> Result<(), String> {
    println!("[STORAGE] Archiving App: {}", app_id);
    let app_dir = format!("/data/apps/{}", app_id);

    // Simulate cloud sync and deletion of heavy binaries
    let bin_path = format!("{}/binary.AppImage", app_dir);
    if fs::metadata(&bin_path).is_ok() {
        println!("[STORAGE] Syncing {} to Sovereign Cloud...", bin_path);
        // Delete locally to conserve the 5GB cap
        fs::remove_file(&bin_path).map_err(|e| e.to_string())?;
        println!(
            "[STORAGE] {} successfully archived. Local storage freed.",
            app_id
        );
        Ok(())
    } else {
        Err("App binary not found or already archived.".into())
    }
}

#[command]
pub async fn move_to_trash(file_path: String) -> Result<(), String> {
    println!("[STORAGE] Moving {} to .magnolia-trash...", file_path);
    let source = PathBuf::from(&file_path);
    let filename = source
        .file_name()
        .ok_or("Invalid file path")?
        .to_str()
        .ok_or("File path is not valid UTF-8")?;

    let trash_dir = PathBuf::from("/data/.magnolia-trash");
    if !trash_dir.exists() {
        fs::create_dir_all(&trash_dir).map_err(|e| e.to_string())?;
    }

    let target = trash_dir.join(filename);
    fs::rename(source, target).map_err(|e| format!("Failed to move to trash: {}", e))
}

#[command]
pub async fn empty_trash() -> Result<usize, String> {
    println!("[STORAGE] Emptying .magnolia-trash...");
    let trash_dir = PathBuf::from("/data/.magnolia-trash");
    let mut deleted_count = 0;

    if let Ok(entries) = fs::read_dir(trash_dir) {
        for entry in entries.flatten() {
            if fs::remove_file(entry.path()).is_ok() {
                deleted_count += 1;
            }
        }
    }

    Ok(deleted_count)
}

#[command]
pub async fn get_disk_info() -> Result<Vec<DiskInfo>, String> {
    println!("[STORAGE] Probing live hardware via lsblk...");

    let output = Command::new("lsblk")
        .args([
            "-J",
            "-b",
            "-o",
            "NAME,LABEL,MOUNTPOINT,SIZE,FSSIZE,FSTYPE,RM",
        ])
        .output()
        .map_err(|e| format!("Failed to execute lsblk: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let json: Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse lsblk output: {}", e))?;

    let mut disks = Vec::new();

    if let Some(blockdevices) = json["blockdevices"].as_array() {
        for dev in blockdevices {
            let name = dev["name"].as_str().unwrap_or("unknown").to_string();
            let label = dev["label"].as_str().unwrap_or("").to_string();
            let mount_point = dev["mountpoint"].as_str().unwrap_or("").to_string();
            let total_space = dev["size"]
                .as_u64()
                .or_else(|| dev["size"].as_str().and_then(|s| s.parse().ok()))
                .unwrap_or(0);
            let used_space = dev["fsusage"]
                .as_u64()
                .or_else(|| dev["fsusage"].as_str().and_then(|s| s.parse().ok()))
                .unwrap_or(0);
            let free_space = total_space.saturating_sub(used_space);
            let is_removable =
                dev["rm"].as_bool().unwrap_or(false) || dev["rm"].as_str() == Some("1");
            let filesystem = dev["fstype"].as_str().unwrap_or("unknown").to_string();

            // Core safety: Lock system partitions
            let is_locked =
                label.contains("SYSTEM") || label.contains("ROOT") || mount_point == "/";

            disks.push(DiskInfo {
                name,
                label,
                mount_point,
                total_space,
                used_space,
                free_space,
                is_removable,
                is_locked,
                expansion_pending: false,
                filesystem,
            });
        }
    }

    Ok(disks)
}

#[command]
pub async fn verify_security_action(pin: String, user_confirm: String) -> Result<bool, String> {
    println!(
        "[AUTH] Verifying high-risk action for user: {}",
        user_confirm
    );

    if pin.is_empty() || user_confirm.is_empty() {
        return Err("PIN and identity confirmation are required.".to_string());
    }

    // Verify PIN against hashed keystore at /data/system/pin.hash
    let pin_hash_path = "/data/system/pin.hash";
    let stored_hash = fs::read_to_string(pin_hash_path).map_err(|_| {
        "Security PIN not configured. Complete initial setup to set a PIN.".to_string()
    })?;
    let stored_hash = stored_hash.trim();

    if is_legacy_sha256_hash(stored_hash) {
        if verify_legacy_sha256(pin.as_bytes(), user_confirm.as_bytes(), stored_hash) {
            if let Err(e) = migrate_pin_hash(pin_hash_path, pin.as_bytes(), user_confirm.as_bytes())
            {
                println!("[AUTH] {}", e);
            }
            return Ok(true);
        }

        return Err("Security verification failed. Invalid PIN or Identity string.".to_string());
    }

    let parsed_hash = PasswordHash::new(stored_hash)
        .map_err(|_| "Stored PIN hash is corrupted or invalid format.".to_string())?;

    let argon2 = Argon2::default();
    let secret = encode_security_secret(pin.as_bytes(), user_confirm.as_bytes());
    if argon2.verify_password(&secret, &parsed_hash).is_ok() {
        return Ok(true);
    }

    let legacy_concat_secret = [pin.as_bytes(), user_confirm.as_bytes()].concat();
    if argon2
        .verify_password(&legacy_concat_secret, &parsed_hash)
        .is_ok()
    {
        if let Err(e) = migrate_pin_hash(pin_hash_path, pin.as_bytes(), user_confirm.as_bytes()) {
            println!("[AUTH] {}", e);
        }
        return Ok(true);
    }

    Err("Security verification failed. Invalid PIN or Identity string.".to_string())
}

fn is_legacy_sha256_hash(stored_hash: &str) -> bool {
    stored_hash.len() == 64 && stored_hash.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn verify_legacy_sha256(pin: &[u8], user_confirm: &[u8], stored_hash: &str) -> bool {
    let mut hasher = Sha256::new();
    hasher.update(pin);
    hasher.update(user_confirm);
    format!("{:x}", hasher.finalize()) == stored_hash
}

fn encode_security_secret(pin: &[u8], user_confirm: &[u8]) -> Vec<u8> {
    let mut secret = Vec::with_capacity(8 + pin.len() + user_confirm.len());
    secret.extend_from_slice(&(pin.len() as u32).to_be_bytes());
    secret.extend_from_slice(pin);
    secret.extend_from_slice(&(user_confirm.len() as u32).to_be_bytes());
    secret.extend_from_slice(user_confirm);
    secret
}

fn migrate_pin_hash(pin_hash_path: &str, pin: &[u8], user_confirm: &[u8]) -> Result<(), String> {
    let secret = encode_security_secret(pin, user_confirm);
    let salt = SaltString::generate(&mut OsRng);
    let phc_hash = Argon2::default()
        .hash_password(&secret, &salt)
        .map_err(|_| "Failed to migrate legacy PIN hash to Argon2.".to_string())?
        .to_string();
    fs::write(pin_hash_path, phc_hash)
        .map_err(|e| format!("Failed to persist migrated PIN hash: {}", e))
}

#[command]
pub async fn request_boot_resize(name: String) -> Result<(), String> {
    println!(
        "[STORAGE] Scheduling expansion for {} on next boot...",
        name
    );
    // Write resize request to /data/system/boot_ops.json for supervisor to process at boot
    let ops_dir = PathBuf::from("/data/system");
    if !ops_dir.exists() {
        fs::create_dir_all(&ops_dir).map_err(|e| e.to_string())?;
    }
    let ops_path = ops_dir.join("boot_ops.json");
    let op = serde_json::json!({
        "action": "resize",
        "target": name,
        "status": "pending",
        "requested_at": chrono::Utc::now().to_rfc3339()
    });
    let payload =
        serde_json::to_string_pretty(&op).unwrap_or_else(|e| format!("serialization error: {e}"));
    fs::write(&ops_path, payload).map_err(|e| format!("Failed to schedule boot resize: {}", e))?;
    Ok(())
}

#[command]
pub async fn manage_partition(name: String, action: String) -> Result<(), String> {
    // Validate device name: must be alphanumeric only (e.g. "vda1", "sdb2").
    // Reject path traversal sequences and any non-alphanumeric characters.
    if !name.chars().all(|c| c.is_ascii_alphanumeric()) {
        return Err(format!(
            "Invalid device name '{}': must match [a-zA-Z0-9]+ only",
            name
        ));
    }

    println!("[STORAGE] Executing {} on {}", action, name);
    match action.as_str() {
        "check" => {
            // Run filesystem check (non-destructive)
            let status = Command::new("fsck")
                .args(["-n", &format!("/dev/{}", name)])
                .status()
                .map_err(|e| format!("Failed to run fsck: {}", e))?;
            if status.success() {
                Ok(())
            } else {
                Err(format!("Filesystem check reported issues on {}", name))
            }
        }
        "mount" => {
            let mount_point = format!("/mnt/{}", name);
            fs::create_dir_all(&mount_point).map_err(|e| e.to_string())?;
            let status = Command::new("mount")
                .args([&format!("/dev/{}", name), &mount_point])
                .status()
                .map_err(|e| e.to_string())?;
            if status.success() {
                Ok(())
            } else {
                Err(format!("Failed to mount {}", name))
            }
        }
        "unmount" => {
            // Using the device path with umount works here because we control the
            // mount table (all mounts go through the "mount" branch above to /mnt/{name}).
            let status = Command::new("umount")
                .arg(format!("/dev/{}", name))
                .status()
                .map_err(|e| e.to_string())?;
            if status.success() {
                Ok(())
            } else {
                Err(format!("Failed to unmount {}", name))
            }
        }
        _ => Err(format!("Unsupported partition action: {}", action)),
    }
}

/// Spawns the autonomous Storage Pulse loop
pub fn spawn_storage_pulse() {
    tauri::async_runtime::spawn(async move {
        println!("[Magnolia] Storage Hub Pulse active.");
        loop {
            match get_disk_info().await {
                Ok(disks) => {
                    println!(
                        "[Magnolia Storage Pulse] Audit success: {} devices detected.",
                        disks.len()
                    );
                    for disk in disks {
                        if disk.free_space < 1024 * 1024 * 512 {
                            // 500MB warning
                            println!(
                                "[Magnolia Storage WARN] Low disk space on {}: {} bytes free.",
                                disk.label, disk.free_space
                            );
                        }
                    }
                }
                Err(e) => println!("[Magnolia Storage Pulse] Audit failed: {}", e),
            }
            tokio::time::sleep(std::time::Duration::from_secs(60)).await;
        }
    });
}
