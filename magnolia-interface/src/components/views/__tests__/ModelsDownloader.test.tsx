import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';
import toast from 'react-hot-toast';

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => {
  const invokeMock = vi.fn();
  return {
    invoke: invokeMock,
    default: {
      invoke: invokeMock,
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

describe('ModelsDownloader', () => {
  let invokeMock: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Silence console.error for expected failures
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const tauriApi = await import('@tauri-apps/api/core');
    // @ts-expect-error - Mocking Tauri invoke
    invokeMock = tauriApi.invoke;

    // Default mock implementation for mount
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve(['model1.gguf']);
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });
  });

  it('renders correctly and loads initial local models', async () => {
    await act(async () => {
      render(<ModelsDownloader />);
    });

    expect(screen.getByText('Models')).toBeInTheDocument();

    // Wait for the local models to load
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });
  });

  it('shows skeleton loaders and empty state checks', async () => {
    await act(async () => {
      render(<ModelsDownloader />);
    });

    // Configure mock for search failure mapping to empty state
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'TheBloke/Llama', size_on_disk_bytes: 4000 });
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
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

  it('handles HuggingFace 401 errors during search appropriately', async () => {
    await act(async () => {
      render(<ModelsDownloader />);
    });

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'search_hf_models') return Promise.reject(new Error('HTTP Error: 401 Unauthorized'));
      if (cmd === 'get_local_models') return Promise.resolve([]);
      return Promise.resolve();
    });

    const input = screen.getByPlaceholderText('Search for a model to download');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'llama' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "HuggingFace Access Denied. Please verify your API Key in System Hub.",
        { duration: 5000 }
      );
    });
  });
});
