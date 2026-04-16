with open("magnolia-core/src/system/storage.rs", "r") as f:
    data = f.read()

import re

# Fix chunk 1
data = re.sub(
    r"<<<<<<< HEAD\n\s*let base_dir = std::path::Path::new\(\"/data/apps\"\);\n\s*let app_dir = base_dir\.join\(&app_id\);\n\s*if !app_dir\.starts_with\(base_dir\) {\n\s*return Err\(\"Path traversal detected\.\"\.into\(\)\);\n\s*}\n=======\n\n\s*let base_dir = PathBuf::from\(\"/data/apps\"\);\n\s*let app_dir = base_dir\.join\(&app_id\);\n>>>>>>> origin/main",
    """    let base_dir = PathBuf::from("/data/apps");
    let app_dir = base_dir.join(&app_id);

    if !app_dir.starts_with(&base_dir) {
        return Err("Path traversal detected.".into());
    }""",
    data
)

# Fix chunk 2
data = re.sub(
    r"<<<<<<< HEAD\n\s*println\!.*bin_path\.display\(\)\);\n=======\n\s*println!\(\n\s*\"\[STORAGE\] Syncing \{\} to Sovereign Cloud\.\.\.\",\n\s*bin_path\.display\(\)\n\s*\);\n>>>>>>> origin/main",
    """        println!(
            "[STORAGE] Syncing {} to Sovereign Cloud...",
            bin_path.display()
        );""",
    data
)

# Fix chunk 3
data = re.sub(
    r"<<<<<<< HEAD\n\s*if !source\.starts_with\(\"/data/\"\) \{\n\s*return Err\(\"Permission denied: can only move files from /data/\"\.into\(\)\);\n\s*\}\n\s*let filename = source\n=======\n\s*let canonical_source =\n\s*fs::canonicalize\(&source\)\.map_err\(\|_\| \"File not found or access denied\"\.to_string\(\)\)\?;\n\n\s*if !canonical_source\.starts_with\(\"/data\"\) \{\n\s*return Err\(\"Security error: Cannot move files outside of /data to trash\.\"\.to_string\(\)\);\n\s*\}\n\n\s*let filename = canonical_source\n>>>>>>> origin/main",
    """    let canonical_source =
        fs::canonicalize(&source).map_err(|_| "File not found or access denied".to_string())?;

    if !canonical_source.starts_with("/data") {
        return Err("Security error: Cannot move files outside of /data to trash.".to_string());
    }

    let filename = canonical_source""",
    data
)

with open("magnolia-core/src/system/storage.rs", "w") as f:
    f.write(data)
