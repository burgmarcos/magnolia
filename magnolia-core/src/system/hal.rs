use tauri::command;

#[command]
pub async fn set_system_volume(volume: u8) -> Result<(), String> {
    println!("[HAL] Setting Volume to {}%", volume);
    // Uses amixer or pactl (PipeWire)
    // pactl set-sink-volume @DEFAULT_SINK@ 50%
    let vol_str = format!("{}%", volume.clamp(0, 100));
    let status = Command::new("pactl")
        .args(["set-sink-volume", "@DEFAULT_SINK@", &vol_str])
        .status();

    match status {
        Ok(s) if s.success() => Ok(()),
        Ok(_) => Err("Failed to set volume via pactl (non-zero exit).".into()),
        Err(e) => Err(format!("Could not execute pactl: {}", e)),
    }
}

#[command]
pub async fn set_system_brightness(brightness: u8) -> Result<(), String> {
    println!("[HAL] Setting Brightness to {}%", brightness);
    // Uses brightnessctl or direct sysfs fallback
    let bright_str = format!("{}%", brightness.clamp(0, 100));
    let status = Command::new("brightnessctl")
        .args(["set", &bright_str])
        .status();

    if let Ok(s) = status {
        if s.success() {
            return Ok(());
        }
    }

    // Fallback: search for a backlight device in sysfs
    if let Ok(entries) = fs::read_dir("/sys/class/backlight") {
        for entry in entries.flatten() {
            let path = entry.path().join("brightness");
            let max_path = entry.path().join("max_brightness");
            if let Ok(max_val_str) = fs::read_to_string(max_path) {
                if let Ok(max_val) = max_val_str.trim().parse::<u32>() {
                    let target = (brightness as u32 * max_val) / 100;
                    let _ = fs::write(path, target.to_string());
                    return Ok(());
                }
            }
        }
    }

    Err("Failed to set brightness via brightnessctl or sysfs".into())
}

#[command]
pub async fn set_hardware_killswitch(device: String, block: bool) -> Result<(), String> {
    println!(
        "[HAL] Setting Hardware Killswitch for {} -> Blocked: {}",
        device, block
    );
    // Conceptual mock for Sandbox block (requires udev reloading or rfkill)
    let action = if block { "block" } else { "unblock" };

    let target = match device.as_str() {
        "wlan" | "wifi" => "wlan",
        "bluetooth" => "bluetooth",
        "nfc" => "nfc",
        _ => {
            return Err(format!(
                "Device type {} not directly supported by rfkill",
                device
            ))
        }
    };

    let status = Command::new("rfkill").args([action, target]).status();

    match status {
        Ok(s) if s.success() => Ok(()),
        Ok(_) => Err(format!("rfkill failed to {} {}", action, target)),
        Err(e) => Err(format!("Could not execute rfkill: {}", e)),
    }
}

#[command]
pub async fn set_power_saving_mode(enabled: bool) -> Result<(), String> {
    println!("[HAL] Setting Power Saving Mode to {}", enabled);
    // Control CPU governor
    let governor = if enabled { "powersave" } else { "performance" };

    println!("[HAL] Targeting scaling_governor: {}", governor);

    // 1. Try cpufreq-set
    let _ = Command::new("cpufreq-set").args(["-g", governor]).status();

    // 2. Direct Sysfs Steel Implementation (100% Mock-Free)
    if let Ok(entries) = fs::read_dir("/sys/devices/system/cpu") {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with("cpu") && name[3..].chars().all(|c| c.is_ascii_digit()) {
                let gov_path = entry.path().join("cpufreq/scaling_governor");
                if gov_path.exists() {
                    let _ = fs::write(&gov_path, governor);
                }
            }
        }
    }

    Ok(())
}

#[command]
pub async fn suggest_performance_mode() -> Result<String, String> {
    println!("[HAL] Analyzing lifestyle logs for performance suggestion...");

    // In production, we query the lifestyle_audit.json and check for high-demand apps (e.g. Llama Vault)
    let log_path = "/data/system/lifestyle_audit.json";
    if let Ok(contents) = fs::read_to_string(log_path) {
        if contents.contains("Llama Vault") || contents.contains("sovereign-node") {
            return Ok("turbo".to_string());
        }
    }

    Ok("eco".to_string())
}

/// Spawns the autonomous HAL Maintenance loop
pub fn spawn_hal_maintenance() {
    tauri::async_runtime::spawn(async move {
        println!("[Magnolia] HAL Maintenance Pulse active.");
        loop {
            // Task 1: Check Thermal State (sysfs mock)
            let temp_path = "/sys/class/thermal/thermal_zone0/temp";
            let temp = if let Ok(t) = fs::read_to_string(temp_path) {
                t.trim().parse::<u32>().unwrap_or(0) / 1000
            } else {
                45 // Fake nominal 45C
            };

            println!("[Magnolia HAL Pulse] CPU Temp: {}C", temp);

            // Task 2: Suggest Performance Mode based on logs
            if let Ok(suggestion) = suggest_performance_mode().await {
                if suggestion == "turbo" && temp < 80 {
                    let _ = set_power_saving_mode(false).await;
                } else if temp > 85 {
                    let _ = set_power_saving_mode(true).await;
                }
            }

            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
        }
    });
}
