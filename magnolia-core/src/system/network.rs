use serde::Serialize;
use std::process::Command;
use tauri::command;

#[derive(Debug, Serialize, PartialEq)]
pub struct WifiNetwork {
    ssid: String,
    strength: u8,
}

#[derive(Debug, Serialize, PartialEq)]
pub struct BtDevice {
    name: String,
    mac: String,
    is_le: bool,
}

pub fn parse_nmcli_output(stdout: &str) -> Vec<WifiNetwork> {
    let mut networks = Vec::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split(':').collect();
        if parts.len() >= 2 {
            let ssid = parts[0].to_string();
            if ssid.is_empty() {
                continue;
            }
            let strength = parts[1].parse::<u8>().unwrap_or(0);
            networks.push(WifiNetwork { ssid, strength });
        }
    }
    networks
}

pub fn parse_bluetoothctl_output(stdout: &str) -> Vec<BtDevice> {
    let mut devices = Vec::new();
    for line in stdout.lines() {
        // Line format: "Device AA:BB:CC:DD:EE:FF Name"
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let mac = parts[1].to_string();
            let name = parts[2..].join(" ");
            devices.push(BtDevice {
                name,
                mac,
                is_le: false,
            });
        }
    }
    devices
}

#[command]
pub async fn scan_wifi(interface: String) -> Result<Vec<WifiNetwork>, String> {
    println!("[NETWORK] Scanning WiFi on {}...", interface);

    let output = match Command::new("nmcli")
        .args(["-t", "-f", "SSID,SIGNAL", "dev", "wifi"])
        .output()
    {
        Ok(o) => o,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Err("nmcli not found - radio hardware interface missing".to_string());
        }
        Err(e) => return Err(format!("Failed to execute nmcli: {}", e)),
    };

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_nmcli_output(&stdout))
}

#[command]
pub async fn scan_bluetooth() -> Result<Vec<BtDevice>, String> {
    println!("[NETWORK] Scanning Bluetooth controllers via bluetoothctl...");

    let output = match Command::new("bluetoothctl").arg("devices").output() {
        Ok(o) => o,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Err("bluetoothctl not found - controller missing".to_string());
        }
        Err(e) => return Err(format!("Failed to execute bluetoothctl: {}", e)),
    };

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(parse_bluetoothctl_output(&stdout))
}

/// Spawns the autonomous Network Lattice loop
pub fn spawn_network_lattice() {
    tauri::async_runtime::spawn(async move {
        println!("[Magnolia] Network Lattice Pulse active.");
        loop {
            // Priority 1: WiFi Scan
            match scan_wifi("wlan0".to_string()).await {
                Ok(nets) => println!(
                    "[Magnolia Network Pulse] WiFi: {} SSIDs in range.",
                    nets.len()
                ),
                Err(e) => println!("[Magnolia Network Pulse] WiFi scan failed: {}", e),
            }

            // Priority 2: Bluetooth Scan
            match scan_bluetooth().await {
                Ok(devs) => println!(
                    "[Magnolia Network Pulse] Bluetooth: {} devices visible.",
                    devs.len()
                ),
                Err(e) => println!("[Magnolia Network Pulse] BT scan failed: {}", e),
            }

            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_spawn_network_lattice_runs() {
        spawn_network_lattice();
    }
}

#[cfg(test)]
mod tests_parsing {
    use super::*;

    #[test]
    fn test_parse_nmcli_output() {
        let output = "MyWiFi:80\nOtherWiFi:50\n:0\nInvalidLine\n";
        let networks = parse_nmcli_output(output);
        assert_eq!(networks.len(), 2);
        assert_eq!(networks[0].ssid, "MyWiFi");
        assert_eq!(networks[0].strength, 80);
        assert_eq!(networks[1].ssid, "OtherWiFi");
        assert_eq!(networks[1].strength, 50);
    }

    #[test]
    fn test_parse_bluetoothctl_output() {
        let output = "Device AA:BB:CC:DD:EE:FF My Headphones\nDevice 11:22:33:44:55:66 Unknown\nInvalid Line\n";
        let devices = parse_bluetoothctl_output(output);
        assert_eq!(devices.len(), 2);
        assert_eq!(devices[0].mac, "AA:BB:CC:DD:EE:FF");
        assert_eq!(devices[0].name, "My Headphones");
        assert_eq!(devices[1].mac, "11:22:33:44:55:66");
        assert_eq!(devices[1].name, "Unknown");
    }
}
