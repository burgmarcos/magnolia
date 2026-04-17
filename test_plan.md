1. Add `get_all_local_models_info` in `magnolia-core/src/handlers/models.rs`.
   - The handler will determine the available local models, measure their size, and run `assess_model_fit_internal` on them, then return a list/array of model info objects.
2. Define a struct `LocalModelInfo` in `magnolia-core/src/handlers/models.rs` with fields `name`, `size_bytes`, and `fit_status`. Make sure it uses `serde::Serialize`.
3. Register `get_all_local_models_info` in `magnolia-core/src/lib.rs`.
4. Update `ModelsDownloader.tsx` to use `get_all_local_models_info` to replace `get_local_models`, `get_local_model_size_bytes`, and `assess_model_fit` calls in `useEffect`, saving performance by removing sequential IPC calls.
5. Create a benchmark to show performance improvement (optional if it's UI/IPC latency which might be difficult to test consistently locally, but we can measure time taken around the IPC call vs new IPC call).
