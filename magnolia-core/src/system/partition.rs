use std::fs;
use std::path::Path;
use std::process::Command;

pub enum Partition {
    SystemA,
    SystemB,
    User,
}

pub fn get_active_partition() -> Result<Partition, String> {
    // Logic to detect which partition is currently mounted as / (root)
    // For now, assume SystemA by default or detect via /proc/cmdline
    let cmdline = fs::read_to_string("/proc/cmdline").unwrap_or_default();
    if cmdline.contains("root=LABEL=Magnolia_SYSTEM_B") {
        Ok(Partition::SystemB)
    } else {
        Ok(Partition::SystemA)
    }
}

pub fn unlock_partition(device: &str, name: &str, password: &str) -> Result<(), String> {
    println!("[Magnolia] Opening LUKS partition: {} -> {}", device, name);

    use std::io::Write;
    use std::process::Stdio;

    let mut child = Command::new("cryptsetup")
        .args(["luksOpen", device, name, "--key-file", "-"])
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn cryptsetup: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(password.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if !status.success() {
        return Err("Cryptsetup operation failed".into());
    }

    Ok(())
}

pub fn mount_user_data(mapped_name: &str, mount_point: &str) -> Result<(), String> {
    let device = format!("/dev/mapper/{}", mapped_name);
    if !Path::new(mount_point).exists() {
        fs::create_dir_all(mount_point).map_err(|e| e.to_string())?;
    }

    let status = Command::new("mount")
        .args([&device, mount_point])
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("Failed to mount user data partition".into());
    }

    Ok(())
}
