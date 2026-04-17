🔒 Fix Path Traversal in archive_app

🎯 What:
The `archive_app` function was taking user input (`app_id`) directly into a path `format!("/data/apps/{}", app_id)`. If this variable contained malicious patterns (like `../`), it could have allowed path traversal beyond the designated apps directory.
The fix includes sanitization for the `app_id` to ensure it only contains valid characters (`-`, `_`, `.`, and alphanumeric) and does not include traversal strings like `..`. Additionally, an accompanying test `test_archive_app_path_traversal` was included to prevent regressions.

⚠️ Risk:
A low-to-medium risk depending on system privileges and configuration, as path traversal combined with a subsequent `fs::remove_file` would allow deletion of arbitrary files across the system if they happened to match the expected format (e.g. `binary.AppImage`). Although constrained, it posed an architectural vulnerability.

🛡️ Solution:
The system now explicitly validates the `app_id` to strictly limit the available character space and block `..`, returning a precise traversal error otherwise. This ensures the app location is firmly constrained to `/data/apps/<app_id>`.
