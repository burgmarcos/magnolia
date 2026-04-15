/**
 * @vitest-environment jsdom
 */
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { MainDesktop } from '../MainDesktop';
import { WindowProvider } from '../../../contexts/WindowContext';

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
  },
  Toaster: () => null,
}));

describe('MainDesktop', () => {
  let invokeMock: Mock;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock console.error to track calls and prevent noise
    console.error = vi.fn();
    console.log = vi.fn();

    const tauriApi = await import('@tauri-apps/api/core');
    // @ts-expect-error - Mocking Tauri invoke
    invokeMock = tauriApi.invoke;

    // Setup ResizeObserver mock as it might be needed by some components
    vi.stubGlobal('ResizeObserver', class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    vi.unstubAllGlobals();
  });

  it('handles trigger_embedding_job error when initializing knowledge directory', async () => {
    // Ensure localStorage is empty for the knowledge path
    expect(localStorage.getItem('Magnolia-knowledge-path')).toBeNull();

    // Mock implementations
    const testError = new Error('Embedding job failed');
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'load_session') return Promise.resolve({ windows: [], configs: {} });
      if (cmd === 'ensure_default_knowledge_dir') return Promise.resolve('/test/knowledge/path');
      if (cmd === 'index_local_folder') return Promise.resolve();
      if (cmd === 'trigger_embedding_job') return Promise.reject(testError);
      if (cmd === 'detect_gpu') return Promise.resolve({ vendor: 'test', model: 'test', requires_proprietary: false });
      return Promise.resolve();
    });

    render(
      <WindowProvider>
        <MainDesktop />
      </WindowProvider>
    );

    // Wait for the async operations to complete
    await waitFor(() => {
      // It should call ensure_default_knowledge_dir
      expect(invokeMock).toHaveBeenCalledWith('ensure_default_knowledge_dir');

      // It should call index_local_folder with the resolved path
      expect(invokeMock).toHaveBeenCalledWith('index_local_folder', { path: '/test/knowledge/path' });

      // It should attempt to trigger the embedding job
      expect(invokeMock).toHaveBeenCalledWith('trigger_embedding_job');

      // The error should be logged to console.error
      expect(console.error).toHaveBeenCalledWith(testError);

      // LocalStorage should be updated
      expect(localStorage.getItem('Magnolia-knowledge-path')).toBe('/test/knowledge/path');
    });
  });
});
