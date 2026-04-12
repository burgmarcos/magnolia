use log::{error, info};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone)]
pub struct CloudConfig {
    pub project_id: String,
    pub storage_bucket: String,
}

#[derive(Serialize, Deserialize)]
pub struct UserSyncStatus {
    pub used_bytes: u64,
    pub total_quota: u64,
    pub last_sync: String,
}

pub struct CloudBridge {
    pub config: CloudConfig,
    pub service_account_path: Option<PathBuf>,
}

impl CloudBridge {
    pub async fn init() -> anyhow::Result<Self> {
        let auth_path = PathBuf::from("/data/auth/gcp-sa.json");
        let has_sa = auth_path.exists();

        if has_sa {
            info!(
                "Sovereign Identity: Service Account key detected at {:?}",
                auth_path
            );
        } else {
            error!("Sovereignty Warning: No GCP Service Account key found at {:?}. Cloud features will be restricted.", auth_path);
        }

        Ok(Self {
            config: CloudConfig {
                project_id: "magnolia-os".into(),
                storage_bucket: "magnolia-os-storage-primary".into(),
            },
            service_account_path: if has_sa { Some(auth_path) } else { None },
        })
    }

    pub async fn get_sync_status(&self) -> anyhow::Result<UserSyncStatus> {
        Ok(UserSyncStatus {
            used_bytes: 0,
            total_quota: 5_368_709_120,
            last_sync: "never".into(),
        })
    }
}

pub async fn get_sync_quota() -> anyhow::Result<UserSyncStatus> {
    Ok(UserSyncStatus {
        used_bytes: 0,
        total_quota: 5_368_709_120,
        last_sync: "never".into(),
    })
}
