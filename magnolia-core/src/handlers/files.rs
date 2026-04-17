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
        // Create a temporary directory
        let dir = tempdir().unwrap();
        let dir_path = dir.path();

        // Create some subdirectories
        let sub_dir_1 = dir_path.join("subdir1");
        fs::create_dir(&sub_dir_1).unwrap();

        let sub_dir_2 = dir_path.join("subdir2");
        fs::create_dir(&sub_dir_2).unwrap();

        // Create some files
        let file_1 = dir_path.join("file1.txt");
        fs::write(&file_1, "hello").unwrap();

        let file_2 = dir_path.join("file2.txt");
        fs::write(&file_2, "world!!").unwrap();

        // Call list_directory
        let entries = list_directory(dir_path.to_string_lossy().to_string()).unwrap();

        // Check the length
        assert_eq!(entries.len(), 4);

        // Check the entries and sorting
        // Directories should be first, sorted alphabetically
        assert_eq!(entries[0].name, "subdir1");
        assert!(entries[0].is_dir);

        assert_eq!(entries[1].name, "subdir2");
        assert!(entries[1].is_dir);

        // Files should be next, sorted alphabetically
        assert_eq!(entries[2].name, "file1.txt");
        assert!(!entries[2].is_dir);
        assert_eq!(entries[2].size, 5);

        assert_eq!(entries[3].name, "file2.txt");
        assert!(!entries[3].is_dir);
        assert_eq!(entries[3].size, 7);
    }

    #[test]
    fn test_list_directory_error() {
        let result = list_directory("non_existent_directory_path".to_string());
        assert!(result.is_err());
    }
}
