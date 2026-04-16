import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MainDesktop } from '../MainDesktop';
import { WindowProvider } from '../../../contexts/WindowContext';

vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return {
    invoke: mockInvoke,
    default: {
      invoke: mockInvoke,
    },
  };
});

describe('MainDesktop', () => {
  let invokeMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    const tauriApi = await import('@tauri-apps/api/core');
    // @ts-expect-error - Mocking Tauri invoke
    invokeMock = tauriApi.invoke;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('triggers embedding job error and logs to console', async () => {
    const errorMsg = 'embedding job failed';

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'ensure_default_knowledge_dir') return Promise.resolve('/fake/path');
      if (cmd === 'index_local_folder') return Promise.resolve();
      if (cmd === 'trigger_embedding_job') return Promise.reject(errorMsg);
      return Promise.resolve();
    });

    await act(async () => {
      render(
        <WindowProvider>
          <MainDesktop />
        </WindowProvider>
      );
    });

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(errorMsg);
    });
  });
});
