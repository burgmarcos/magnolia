import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, type Mock } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';

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

// We must also mock react-hot-toast otherwise it might complain
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('ModelsDownloader - Search Models', () => {
  let invokeMock: Mock;

  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    invokeMock = tauriApi.invoke as Mock;

    // Default mock implementation for mount
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_all_local_models_info') return Promise.resolve([{ name: 'model1.gguf', fit_status: 'Fits Perfectly' }]);
      return Promise.resolve();
    });
  });

  it('searches for a model and renders the result', async () => {
    await act(async () => {
      render(<ModelsDownloader />);
    });

    // Wait for initial render to settle
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });

    // Configure mock for search
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'TheBloke/Llama', size_on_disk_bytes: 4000 });
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });

    const input = screen.getByPlaceholderText('Search for a model to download');
    fireEvent.change(input, { target: { value: 'llama' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for search to complete and render the new UI
    await waitFor(() => {
      expect(screen.getByText('Llama')).toBeInTheDocument();
    });
  });
});
