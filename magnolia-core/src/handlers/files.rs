#[derive(serde::Serialize)]
pub struct FileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = std::fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for entry in entries.filter_map(|e| e.ok()) {
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        list.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len(),
        });
    }
    list.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(list)
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(old_path, new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    opener::open(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    opener::open(url).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_list_directory() {
        let dir = tempdir().expect("Failed to create temp dir");
        let dir_path = dir.path();

        // Create a few files and a subdirectory
        fs::write(dir_path.join("a_file.txt"), b"hello").expect("Failed to write file");
        fs::write(dir_path.join("z_file.txt"), b"world!").expect("Failed to write file");
        fs::create_dir(dir_path.join("sub_dir")).expect("Failed to create dir");

        let result = list_directory(dir_path.to_string_lossy().to_string());
        assert!(result.is_ok());

        let entries = result.unwrap();
        assert_eq!(entries.len(), 3);

        // Sorting logic: directories first, then alphabetical
        // 1. sub_dir (dir)
        // 2. a_file.txt (file)
        // 3. z_file.txt (file)

        assert_eq!(entries[0].name, "sub_dir");
        assert!(entries[0].is_dir);

        assert_eq!(entries[1].name, "a_file.txt");
        assert!(!entries[1].is_dir);
        assert_eq!(entries[1].size, 5);

        assert_eq!(entries[2].name, "z_file.txt");
        assert!(!entries[2].is_dir);
        assert_eq!(entries[2].size, 6);
    }
}
