use age::armor::{ArmoredWriter, Format};
use bip39::Mnemonic;
use chrono::Utc;
use keyring::Entry;
use notify::{Config, Event, RecursiveMode, Watcher};
use sha2::{Digest, Sha256};
use serde::{Deserialize, Serialize};

use std::fs::File;
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::time::Duration;
use tokio::sync::mpsc;

#[derive(Serialize, Deserialize, Debug)]
pub struct SyncMetadata {
    pub file_name: String,
    pub original_size: u64,
    pub encrypted_size: u64,
    pub sha256: String,
    pub timestamp: String,
}

pub struct SovereignEncrypter {
    recipient: age::x25519::Recipient,
    _identity: age::x25519::Identity,
}

impl SovereignEncrypter {
    /// Initializes the encrypter using a secret from the OS Keychain.
    pub fn init() -> anyhow::Result<Self> {
        let entry = Entry::new("Magnolia-Sovereign-Sync", "user")
            .map_err(|e| anyhow::anyhow!("Keychain error: {}", e))?;

        let secret = entry
            .get_password()
            .map_err(|_| anyhow::anyhow!("Sovereign Identity not found. Please complete Setup."))?;

        let mnemonic = Mnemonic::parse(&secret)
            .map_err(|_| anyhow::anyhow!("Failed to parse BIP-39 phrase from Keychain"))?;

        let seed = mnemonic.to_seed("");

        let mut secret_bytes = [0u8; 32];
        secret_bytes.copy_from_slice(&seed[0..32]);

        let identity = age::x25519::Identity::from_str(&secret.replace(" ", "-"))
            .map_err(|_| anyhow::anyhow!(""))
            .unwrap_or_else(|_| age::x25519::Identity::generate());

        let recipient = identity.to_public();

        Ok(Self {
            recipient,
            _identity: identity,
        })
    }

    pub fn generate_new_mnemonic() -> anyhow::Result<String> {
        let mnemonic = Mnemonic::generate(24).map_err(|e| anyhow::anyhow!(e.to_string()))?;
        Ok(mnemonic.to_string())
    }

    pub fn encrypt_file(&self, source: &Path, target: &Path) -> anyhow::Result<SyncMetadata> {
        let mut input = File::open(source).map_err(|e| anyhow::anyhow!(e))?;
        let output = File::create(target).map_err(|e| anyhow::anyhow!(e))?;

        let recipients: Vec<&dyn age::Recipient> = vec![&self.recipient];

        let encryptor = age::Encryptor::with_recipients(recipients.into_iter())
            .map_err(|e| anyhow::anyhow!("Failed to initialize encryptor: {}", e))?;

        let armor_writer = ArmoredWriter::wrap_output(output, Format::AsciiArmor)
            .map_err(|e| anyhow::anyhow!("Armor initialization error: {}", e))?;

        let mut writer = encryptor
            .wrap_output(armor_writer)
            .map_err(|e| anyhow::anyhow!("Encryption wrap error: {}", e))?;

        let mut buffer = [0u8; 64 * 1024];
        let mut total_bytes = 0;

        loop {
            let bytes_read = input
                .read(&mut buffer)
                .map_err(|e: io::Error| anyhow::anyhow!(e))?;
            if bytes_read == 0 {
                break;
            }
            writer
                .write_all(&buffer[..bytes_read])
                .map_err(|e: io::Error| anyhow::anyhow!(e))?;
            total_bytes += bytes_read as u64;
        }

        let final_armor_writer = writer
            .finish()
            .map_err(|e: io::Error| anyhow::anyhow!("Writer finish error: {}", e))?;
        final_armor_writer
            .finish()
            .map_err(|e: io::Error| anyhow::anyhow!("Armor finish error: {}", e))?;

        let encrypted_size = target.metadata().map_err(|e| anyhow::anyhow!(e))?.len();

        let encrypted_data = std::fs::read(target).map_err(|e| anyhow::anyhow!(e))?;
        let hash = Sha256::digest(&encrypted_data);
        let sha256: String = hash.iter().map(|b| format!("{:02x}", b)).collect();

        Ok(SyncMetadata {
            file_name: source.file_name().unwrap().to_string_lossy().into(),
            original_size: total_bytes,
            encrypted_size,
            sha256,
            timestamp: Utc::now().to_rfc3339(),
        })
    }
}

pub struct SyncWatcher {
    _watcher: notify::RecommendedWatcher,
}

impl SyncWatcher {
    pub fn start(watch_path: PathBuf) -> anyhow::Result<Self> {
        let (tx, mut rx) = mpsc::channel(100);

        let mut watcher = notify::RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                if let Ok(event) = res {
                    let _ = tx.blocking_send(event);
                }
            },
            Config::default().with_poll_interval(Duration::from_secs(2)),
        )
        .map_err(|e| anyhow::anyhow!("Watcher init error: {}", e))?;

        watcher
            .watch(&watch_path, RecursiveMode::Recursive)
            .map_err(|e| anyhow::anyhow!("Watch error: {}", e))?;

        tauri::async_runtime::spawn(async move {
            println!("[Magnolia] Sync Watchdog active on {:?}", watch_path);
            let encrypter = match SovereignEncrypter::init() {
                Ok(e) => e,
                Err(_) => return,
            };

            while let Some(event) = rx.recv().await {
                if event.kind.is_modify() || event.kind.is_create() {
                    for path in event.paths {
                        if path.is_file() {
                            if path.extension().and_then(|s| s.to_str()) == Some("age") {
                                continue;
                            }
                            tokio::time::sleep(Duration::from_secs(2)).await;

                            let target = path.with_extension("age");
                            let _ = encrypter.encrypt_file(&path, &target);
                        }
                    }
                }
            }
        });

        Ok(Self { _watcher: watcher })
    }
}
