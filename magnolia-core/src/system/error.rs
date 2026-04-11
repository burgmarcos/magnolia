use anyhow::Error;

pub trait ToBridgeResult<T> {
    fn map_bridge_err(self) -> Result<T, String>;
}

impl<T> ToBridgeResult<T> for anyhow::Result<T> {
    fn map_bridge_err(self) -> Result<T, String> {
        self.map_err(|e| e.to_string())
    }
}

pub fn bridge_err<E: std::fmt::Display>(err: E) -> String {
    err.to_string()
}
