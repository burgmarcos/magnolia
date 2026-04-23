🧹 [Code Health] Implement Tasks Widget Features

🎯 What:
- Implemented task addition functionality by introducing a new `input` field.
- Implemented clearing all tasks with the 'Clear' button.
- Cleaned up unused functions.

💡 Why:
- The widget had static content and placeholder buttons that lacked underlying functionality. Adding these features ensures a complete user experience for basic interactions and reduces developer confusion about missing interactive states.

✅ Verification:
- Tests pass (`npx vitest run`).
- Application builds and runs locally.
- Verified linting without regressions.
- Tested user flows locally in browser headless via Playwright.

✨ Result:
- The TasksWidget is fully functional with respect to its Add and Clear capabilities while correctly mapping state and preserving design paradigms.
