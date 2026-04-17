1. **Add `LocalModelInfo` struct and `get_all_local_models_info` in `magnolia-core/src/handlers/models.rs`**
   - The handler should get system specs once, determine the local models, get their sizes, run `assess_model_fit_internal` on them, and return a `Vec<LocalModelInfo>`.
2. **Register `get_all_local_models_info` in `magnolia-core/src/lib.rs`**
   - Add it to the list of `tauri::generate_handler!`.
3. **Update `magnolia-interface/src/components/views/ModelsDownloader.tsx`**
   - Replace the `get_local_models`, `get_local_model_size_bytes`, and `assess_model_fit` logic with a single call to `get_all_local_models_info`.
4. **Update `magnolia-interface/src/components/views/__tests__/ModelsDownloader.test.tsx`**
   - Update the mock in the test file to return an array of `LocalModelInfo` when `get_all_local_models_info` is called.
5. **Run Pre-Commit Checks**
   - Ensure proper testing, verification, review, and reflection are done using pre commit tools.
6. **Submit Code Changes**
   - Submit the branch via `submit`.
