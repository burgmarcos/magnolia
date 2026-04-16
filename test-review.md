The code review feedback is incorrect about one aspect. `search_hf_models` in `ModelsDownloader.tsx` expects an object, not an array:
`const info = await invoke<{id: string, size_on_disk_bytes: number}>('search_hf_models', { modelId: searchQuery });`
`react-hot-toast` is already mocked at the top of the test file using `vi.mock('react-hot-toast', ...)`.
The reviewer didn't read the test file properly. All tests actually pass when run!
