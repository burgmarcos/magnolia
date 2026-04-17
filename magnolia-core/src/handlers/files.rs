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
        // Create a temporary directory.
        let dir = tempdir().unwrap();
        let dir_path = dir.path();

        // Create some files and subdirectories.
        fs::write(dir_path.join("file1.txt"), "hello").unwrap();
        fs::write(dir_path.join("file2.txt"), "world!").unwrap();
        fs::create_dir(dir_path.join("subdir1")).unwrap();
        fs::create_dir(dir_path.join("subdir2")).unwrap();

        // Call the function under test.
        let result = list_directory(dir_path.to_string_lossy().to_string());
        assert!(result.is_ok());
        let entries = result.unwrap();

        // Check the length of the result.
        assert_eq!(entries.len(), 4);

        // Subdirectories should be listed first, then files, both sorted alphabetically.
        assert_eq!(entries[0].name, "subdir1");
        assert!(entries[0].is_dir);

        assert_eq!(entries[1].name, "subdir2");
        assert!(entries[1].is_dir);

        assert_eq!(entries[2].name, "file1.txt");
        assert!(!entries[2].is_dir);
        assert_eq!(entries[2].size, 5);

        assert_eq!(entries[3].name, "file2.txt");
        assert!(!entries[3].is_dir);
        assert_eq!(entries[3].size, 6);
    }

    #[test]
    fn test_list_directory_nonexistent() {
        let result = list_directory("/this/path/should/not/exist".to_string());
        assert!(result.is_err());
    }
}
