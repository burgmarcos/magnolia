const fs = require('fs');
let content = fs.readFileSync('magnolia-interface/src/components/views/__tests__/ModelsDownloaderSearch.test.tsx', 'utf8');

// Replace the first conflict
content = content.replace(
`<<<<<<< HEAD:magnolia-interface/src/components/views/__tests__/ModelsDownloader.test.tsx
const mockInvoke = vi.fn();
=======
// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return {
    invoke: mockInvoke,
    default: {
      invoke: mockInvoke,
    }
  };
});
>>>>>>> origin/main:magnolia-interface/src/components/views/__tests__/ModelsDownloaderSearch.test.tsx`,
`const mockInvoke = vi.fn();`
);

// Replace the second conflict
content = content.replace(
`<<<<<<< HEAD:magnolia-interface/src/components/views/__tests__/ModelsDownloader.test.tsx

    invokeMock = mockInvoke;
=======
    const tauriApi = await import('@tauri-apps/api/core');
    invokeMock = tauriApi.invoke as Mock;
>>>>>>> origin/main:magnolia-interface/src/components/views/__tests__/ModelsDownloaderSearch.test.tsx`,
`    invokeMock = mockInvoke as Mock;`
);

// Replace the third conflict
content = content.replace(
`<<<<<<< HEAD:magnolia-interface/src/components/views/__tests__/ModelsDownloader.test.tsx
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
=======
    // Wait for initial render to settle
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });

    // Configure mock for search
    invokeMock.mockImplementation((cmd: string) => {
>>>>>>> origin/main:magnolia-interface/src/components/views/__tests__/ModelsDownloaderSearch.test.tsx`,
`    // Wait for initial render to settle
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });

    // Configure mock for search
    invokeMock.mockImplementation((cmd: string) => {`
);

fs.writeFileSync('magnolia-interface/src/components/views/__tests__/ModelsDownloaderSearch.test.tsx', content);
