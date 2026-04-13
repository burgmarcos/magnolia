use std::fs;
use std::path::Path;
use std::process::Command;

pub enum Partition {
    SystemA,
    SystemB,
    User,
}

pub fn get_active_partition() -> Result<Partition, String> {
    let cmdline = fs::read_to_string("/proc/cmdline").unwrap_or_default();

    // Detect active root from kernel cmdline (supports LABEL, UUID, and device paths)
    // Magnolia uses root=/dev/vda2 (rootfs_a) or root=/dev/vda3 (rootfs_b) on virtio
    if cmdline.contains("root=LABEL=Magnolia_SYSTEM_B")
        || cmdline.contains("root=/dev/vda3")
        || cmdline.contains("rootfs_b")
    {
        Ok(Partition::SystemB)
    } else {
        // Also verify via /proc/mounts for runtime accuracy
        let mounts = fs::read_to_string("/proc/mounts").unwrap_or_default();
        for line in mounts.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 && parts[1] == "/" {
                println!("[PARTITION] Root mounted from: {}", parts[0]);
                if parts[0].contains("vda3") || parts[0].contains("SYSTEM_B") {
                    return Ok(Partition::SystemB);
                }
                break;
            }
        }
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
