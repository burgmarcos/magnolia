🎯 **What:** The testing gap addressed
The requested test for checking component behavior when loading local models failed could not be properly implemented initially because `ModelsDownloader.tsx` relied on dynamic inline `await import('@tauri-apps/api/core')` calls. This breaks the normal Vite / React / vitest hoisting and module-caching behavior, causing `await invoke` to hit the *real* deep unmocked `@tauri-apps/api/core` internals instead of the configured vitest mock, generating uncaught `TypeError` errors in multiple tests.

📊 **Coverage:** What scenarios are now tested
To resolve this properly, `ModelsDownloader.tsx` was refactored to use static top-level imports (`import { invoke } from '@tauri-apps/api/core'`), which is both standard in client-side React and much friendlier to test mocking frameworks. Then, the newly required `handles load local models failure` test was implemented.

✨ **Result:** The improvement in test coverage
We now successfully verify that `toast.error` gets triggered with "Failed to load local models" when the `get_local_models` Tauri `invoke` command throws an error. Test flakiness and dynamic-import failures on mock have been completely resolved! All 3 tests pass smoothly.
