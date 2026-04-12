use std::env;

use std::process::Command;

pub struct BrowserConfig {
    pub label: String,
    pub url: String,
}

pub struct SovereignSandbox {
    pub label: String,
    pub target_url: String,
}

pub fn get_default_browser_config() -> BrowserConfig {
    BrowserConfig {
        label: "Magnolia Dashboard".to_string(),
        url: "http://localhost:5173".to_string(),
    }
}

impl SovereignSandbox {
    pub fn new(label: &str, url: &str) -> Self {
        Self {
            label: label.to_string(),
            target_url: url.to_string(),
        }
    }

    /// Spawns the WPE browser inside a Bubblewrap container.
    /// This limits filesystem access to only what is required for GPU/Wayland.
    pub fn spawn_browser(&self) -> Result<(), String> {
        let mut cmd = Command::new("bwrap");

        // 1. Basic Isolation
        cmd.arg("--unshare-all"); // Unshare all namespaces (PID, IPC, UTS, etc.)
        cmd.arg("--share-net"); // Share network for browsing
        cmd.arg("--new-session");

        // 2. Filesystem - READ ONLY root
        cmd.arg("--ro-bind");
        cmd.arg("/usr");
        cmd.arg("/usr");
        cmd.arg("--ro-bind");
        cmd.arg("/lib");
        cmd.arg("/lib");
        cmd.arg("--ro-bind");
        cmd.arg("/lib64");
        cmd.arg("/lib64");
        cmd.arg("--ro-bind");
        cmd.arg("/bin");
        cmd.arg("/bin");
        cmd.arg("--ro-bind");
        cmd.arg("/sbin");
        cmd.arg("/sbin");
        cmd.arg("--ro-bind");
        cmd.arg("/etc/resolv.conf");
        cmd.arg("/etc/resolv.conf"); // DNS access

        // 3. Dev & Proc
        cmd.arg("--dev");
        cmd.arg("/dev");
        cmd.arg("--proc");
        cmd.arg("/proc");

        // 4. Wayland/GPU Handshake
        // Map GPU acceleration devices
        cmd.arg("--dev-bind");
        cmd.arg("/dev/dri");
        cmd.arg("/dev/dri");

        // Map Wayland Socket (if present)
        if let Ok(runtime_dir) = env::var("XDG_RUNTIME_DIR") {
            cmd.arg("--bind");
            cmd.arg(&runtime_dir);
            cmd.arg(&runtime_dir);
        }

        // 5. Ephemeral Home
        // Provide a minimalist home for the browser's cache/config
        let uid = std::fs::read_to_string("/proc/self/status")
            .ok()
            .and_then(|s| {
                s.lines()
                    .find(|l| l.starts_with("Uid:"))
                    .and_then(|l| l.split_whitespace().nth(1))
                    .and_then(|uid_str| uid_str.parse::<u32>().ok())
            })
            .unwrap_or(1000);
        cmd.arg("--dir");
        cmd.arg(format!("/run/user/{}", uid));
        cmd.arg("--dir");
        cmd.arg("/home/sandbox");
        cmd.arg("--setenv");
        cmd.arg("HOME");
        cmd.arg("/home/sandbox");

        // 6. Execution: The WPE UI Executable
        // Magnolia uses WPE WebKit as its primary Kiosk engine
        cmd.arg("wpe-webkit-kiosk");
        cmd.arg(&self.target_url);

        println!(
            "[Magnolia] Launching Sandboxed View [{}] -> {}",
            self.label, self.target_url
        );

        cmd.spawn()
            .map_err(|e| format!("Failed to launch sandbox: {}", e))?;

        Ok(())
    }
}

pub fn spawn_sandboxed_app(config: BrowserConfig) -> Result<(), String> {
    let sandbox = SovereignSandbox::new(&config.label, &config.url);
    sandbox.spawn_browser()
}
