#[derive(serde::Serialize, Debug, PartialEq, Eq)]
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
    use std::fs::File;
    use tempfile::tempdir;

    #[test]
    fn test_list_directory() {
        let dir = tempdir().unwrap();
        let dir_path = dir.path();

        // Create a few files
        File::create(dir_path.join("file_b.txt")).unwrap();
        File::create(dir_path.join("file_a.txt")).unwrap();

        // Create a few directories
        std::fs::create_dir(dir_path.join("dir_b")).unwrap();
        std::fs::create_dir(dir_path.join("dir_a")).unwrap();

        let result = list_directory(dir_path.to_string_lossy().to_string()).unwrap();

        // Directories should come first, then files, both sorted alphabetically
        assert_eq!(result.len(), 4);

        assert_eq!(result[0].name, "dir_a");
        assert_eq!(result[0].is_dir, true);

        assert_eq!(result[1].name, "dir_b");
        assert_eq!(result[1].is_dir, true);

        assert_eq!(result[2].name, "file_a.txt");
        assert_eq!(result[2].is_dir, false);

        assert_eq!(result[3].name, "file_b.txt");
        assert_eq!(result[3].is_dir, false);
    }

    #[test]
    fn test_list_directory_invalid_path() {
        let result = list_directory("/this/path/should/not/exist/123456789".to_string());
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(!err.is_empty());
    }

    #[test]
    fn test_read_text_file_success() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("hello.txt");
        std::fs::write(&file_path, "hello world").unwrap();

        let result = read_text_file(file_path.to_string_lossy().to_string());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "hello world");
    }

    #[test]
    fn test_read_text_file_not_found() {
        let result = read_text_file("/nonexistent/path/file.txt".to_string());
        assert!(result.is_err());
        assert!(!result.unwrap_err().is_empty());
    }

    #[test]
    fn test_write_text_file_success() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("output.txt");

        let result = write_text_file(
            file_path.to_string_lossy().to_string(),
            "content".to_string(),
        );
        assert!(result.is_ok());
        assert_eq!(std::fs::read_to_string(&file_path).unwrap(), "content");
    }

    #[test]
    fn test_write_text_file_invalid_path() {
        let result = write_text_file("/nonexistent/dir/file.txt".to_string(), "data".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn test_rename_file_success() {
        let dir = tempdir().unwrap();
        let old_path = dir.path().join("old.txt");
        let new_path = dir.path().join("new.txt");
        std::fs::write(&old_path, "data").unwrap();

        let result = rename_file(
            old_path.to_string_lossy().to_string(),
            new_path.to_string_lossy().to_string(),
        );
        assert!(result.is_ok());
        assert!(!old_path.exists());
        assert!(new_path.exists());
    }

    #[test]
    fn test_rename_file_source_not_found() {
        let dir = tempdir().unwrap();
        let result = rename_file(
            dir.path().join("missing.txt").to_string_lossy().to_string(),
            dir.path().join("target.txt").to_string_lossy().to_string(),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_file_success() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("to_delete.txt");
        std::fs::write(&file_path, "bye").unwrap();

        let result = delete_file(file_path.to_string_lossy().to_string());
        assert!(result.is_ok());
        assert!(!file_path.exists());
    }

    #[test]
    fn test_delete_file_not_found() {
        let result = delete_file("/nonexistent/path/ghost.txt".to_string());
        assert!(result.is_err());
    }
}
