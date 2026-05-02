🧪 [testing improvement] Add tests for ModelsDownloader token validation and downloads

## Description

🎯 **What:** The `ModelsDownloader` component lacked test coverage for downloading models and validating/saving HuggingFace tokens. I added specific tests targeting these interactive features.

📊 **Coverage:**
- Downloading models: verifies `downloadModel` interaction, asserting the correct Tauri `invoke` calls are made and `react-hot-toast` displays the expected success/error messages.
- Token validation: verifies `verifyHfToken` and `saveHfToken` functions by simulating UI clicks and input changes, asserting the correct `invoke` calls for validation and key saving alongside their respective success/error toasts.

✨ **Result:** Test coverage for `ModelsDownloader` is significantly improved. The entire test suite (`vitest`) passes successfully and is linted according to project standards.
