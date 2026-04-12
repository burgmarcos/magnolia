#[cfg(windows)]
use mslnk::ShellLink;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
#[cfg(windows)]
use winreg::enums::*;
#[cfg(windows)]
use winreg::RegKey;

#[cfg(windows)]
const APP_NAME: &str = "Magnolia - Sovereign AI OS";
#[cfg(windows)]
const UNINSTALL_REG_KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Magnolia";

pub fn get_install_dir() -> PathBuf {
    // Falls back to current directory if LocalAppData is not found (unlikely on Windows)
    dirs::data_local_dir()
        .unwrap_or_else(|| env::current_dir().unwrap())
        .join("Magnolia")
}

pub fn is_installed() -> bool {
    // Check if the current executable is running from the install directory
    if let Ok(current_exe) = env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            return parent == get_install_dir();
        }
    }
    false
}

#[tauri::command]
pub fn perform_installation() -> Result<(), String> {
    #[cfg(windows)]
    {
        let install_dir = get_install_dir();
        let current_exe = env::current_exe().map_err(|e| e.to_string())?;

        // 1. Create Directories
        if !install_dir.exists() {
            fs::create_dir_all(&install_dir).map_err(|e| e.to_string())?;
        }

        let target_exe = install_dir.join("Magnolia.exe");

        // 2. Copy Executable (if we aren't already it)
        if current_exe != target_exe {
            fs::copy(&current_exe, &target_exe)
                .map_err(|e| format!("Failed to copy executable: {}", e))?;
        }

        // 3. Create Shortcuts
        create_shortcut(&target_exe, "Desktop")
            .map_err(|e| format!("Desktop shortcut error: {}", e))?;
        create_shortcut(&target_exe, "StartMenu")
            .map_err(|e| format!("Start Menu shortcut error: {}", e))?;

        // 4. Register Uninstaller in Windows Registry
        register_uninstaller(&target_exe).map_err(|e| format!("Registry error: {}", e))?;

        Ok(())
    }
    #[cfg(not(windows))]
    {
        // On Magnolia (Linux), installation is handled via the system image.
        Err(
            "Installer is not available in Sovereign Mode (Linux). Use the Magnolia Image build."
                .to_string(),
        )
    }
}

#[cfg(windows)]
fn create_shortcut(target: &std::path::Path, location: &str) -> Result<(), String> {
    let dir = match location {
        "Desktop" => dirs::desktop_dir(),
        "StartMenu" => dirs::data_dir().map(|d| d.join("Microsoft\\Windows\\Start Menu\\Programs")),
        _ => return Err("Invalid shortcut location".into()),
    };

    if let Some(shortcut_dir) = dir {
        if !shortcut_dir.exists() {
            fs::create_dir_all(&shortcut_dir).map_err(|e| e.to_string())?;
        }
        let lnk_path = shortcut_dir.join("Magnolia.lnk");
        let sl = ShellLink::new(target.to_str().unwrap()).map_err(|e| e.to_string())?;
        sl.create_lnk(&lnk_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[cfg(windows)]
fn register_uninstaller(target: &std::path::Path) -> Result<(), std::io::Error> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (key, _) = hkcu.create_subkey(UNINSTALL_REG_KEY)?;

    key.set_value("DisplayName", &APP_NAME)?;
    key.set_value("DisplayIcon", &target.to_str().unwrap())?;

    let uninstall_cmd = format!("\"{}\" --uninstall", target.to_str().unwrap());
    key.set_value("UninstallString", &uninstall_cmd)?;

    key.set_value("Publisher", &"Magnolia Sovereign Team")?;
    key.set_value("NoModify", &1u32)?;
    key.set_value("NoRepair", &1u32)?;

    Ok(())
}

#[tauri::command]
pub fn perform_uninstallation(_delete_data: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        // 1. Remove Registry Key
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let _ = hkcu.delete_subkey(UNINSTALL_REG_KEY); // Ignore if it doesn't exist

        // 2. Remove Shortcuts
        if let Some(desktop) = dirs::desktop_dir() {
            let _ = fs::remove_file(desktop.join("Magnolia.lnk"));
        }
        if let Some(start_menu) = dirs::data_dir() {
            let _ = fs::remove_file(
                start_menu.join("Microsoft\\Windows\\Start Menu\\Programs\\Magnolia.lnk"),
            );
        }

        // 3. Initiate Self-Destruct
        let install_dir = get_install_dir();

        let cmd = if delete_data {
            let app_data = dirs::data_local_dir().unwrap().join("com.Magnolia.desktop");
            format!(
                "timeout /t 2 /nobreak > NUL && rmdir /s /q \"{}\" && rmdir /s /q \"{}\"",
                install_dir.to_str().unwrap(),
                app_data.to_str().unwrap()
            )
        } else {
            format!(
                "timeout /t 2 /nobreak > NUL && rmdir /s /q \"{}\"",
                install_dir.to_str().unwrap()
            )
        };

        Command::new("cmd")
            .args(["/C", &cmd])
            .spawn()
            .map_err(|e| format!("Failed to spawn self-destruct sequence: {}", e))?;

        std::process::exit(0);
    }
    #[cfg(not(windows))]
    {
        // On Magnolia, uninstallation is not a standard feature (Immutable RootFS).
        Err("Uninstallation is disabled on Sovereign Magnolia.".to_string())
    }
}
