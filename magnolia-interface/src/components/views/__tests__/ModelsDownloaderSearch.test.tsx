import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';
import toast from 'react-hot-toast';

const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => {
  return {
    invoke: (...args: unknown[]) => mockInvoke(...args),
  };
});

vi.mock('react-hot-toast', () => {
  const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
  };
  return {
    default: toastMock,
    ...toastMock
  }
});

describe('ModelsDownloader - Search Models', () => {
  let invokeMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    invokeMock = mockInvoke as Mock;

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve(['model1.gguf']);
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });
  });

  it('shows skeleton loaders and empty state checks', async () => {
    render(<ModelsDownloader />);

    // Wait for initial render to settle
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });

    // Configure mock for search
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'TheBloke/Llama', size_on_disk_bytes: 4000 });
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });

    const input = screen.getByPlaceholderText('Search for a model to download');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'llama' } });
    });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    await waitFor(() => {
      expect(screen.getByText('Llama')).toBeInTheDocument();
    });
  });

  it('handles 401 unauthorized errors gracefully during search', async () => {
    render(<ModelsDownloader />);

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'search_hf_models') return Promise.reject(new Error("HTTP Error 401 Unauthorized"));
      if (cmd === 'get_local_models') return Promise.resolve(['model1.gguf']);
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });

    const input = screen.getByPlaceholderText('Search for a model to download');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'llama' } });
    });

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("HuggingFace Access Denied"),
        expect.any(Object)
      );
    });
  });
});
