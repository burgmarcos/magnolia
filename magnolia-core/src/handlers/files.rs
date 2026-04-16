#[derive(serde::Serialize, Debug, PartialEq)]
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
    use std::fs::{self, File};
    use tempfile::tempdir;

    #[test]
    fn test_list_directory() {
        // Create a temporary directory
        let dir = tempdir().expect("Failed to create temporary directory");
        let dir_path = dir.path().to_string_lossy().to_string();

        // Create a file in the temp directory
        let file_path = dir.path().join("test_file.txt");
        File::create(&file_path).expect("Failed to create test file");

        // Create a subdirectory in the temp directory
        let subdir_path = dir.path().join("test_dir");
        fs::create_dir(&subdir_path).expect("Failed to create test directory");

        // Run the function being tested
        let entries = list_directory(dir_path).expect("list_directory failed");

        // Assert we have exactly 2 entries
        assert_eq!(entries.len(), 2);

        // Since we sort directories first, then alphabetically:
        // Entry 0 should be 'test_dir'
        assert_eq!(entries[0].name, "test_dir");
        assert_eq!(entries[0].is_dir, true);

        // Entry 1 should be 'test_file.txt'
        assert_eq!(entries[1].name, "test_file.txt");
        assert_eq!(entries[1].is_dir, false);
        // Size is 0 since we just created an empty file
        assert_eq!(entries[1].size, 0);
    }

    #[test]
    fn test_list_directory_not_found() {
        // Run with a non-existent directory
        let result = list_directory("non_existent_directory_path_12345".to_string());

        // Assert that it returns an Error
        assert!(result.is_err());
    }
}
