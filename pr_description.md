🧪 Testing Improvement for MainDesktop

🎯 **What:** The testing gap for `MainDesktop.tsx` save session failure has been addressed.
📊 **Coverage:** A new test was added to verify that the `onLogout` callback is executed even when the `save_session` Tauri IPC invocation fails, proving the resilience of the logout process.
✨ **Result:** Test suite coverage has improved, and the reliability of the logout functionality is now verified autonomously.
