import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, type Mock } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';
import toast from 'react-hot-toast';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('ModelsDownloader', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  let invokeMock: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    invokeMock = tauriApi.invoke as Mock;
    
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve(['model1.gguf']);
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });
  });

  it('renders correctly and loads initial local models', async () => {
    render(<ModelsDownloader />);
    expect(screen.getByText('Models')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });
  });

  it('searches for a model and renders the result', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'TheBloke/Llama', size_on_disk_bytes: 4000 });
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });

    render(<ModelsDownloader />);

    const input = screen.getByPlaceholderText('Search for a model to download');

    fireEvent.change(input, { target: { value: 'llama' } });
    await waitFor(() => {
      expect(input).toHaveValue('llama');
    });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText(/llama/i)).toBeInTheDocument();
    });
  });

  it('handles download failure and reverts state', async () => {
    let rejectDownload: ((reason?: unknown) => void) | null = null;

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'meta-llama/Llama-2-7b', size_on_disk_bytes: 4000 });
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      if (cmd === 'download_model_file') {
        return new Promise((_, reject) => {
          rejectDownload = reject;
        });
      }
      return Promise.resolve();
    });

    render(<ModelsDownloader />);

    const input = screen.getByPlaceholderText('Search for a model to download');

    fireEvent.change(input, { target: { value: 'Llama' } });
    await waitFor(() => {
      expect(input).toHaveValue('Llama');
    });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText(/Llama-2-7b/i)).toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole('button', { name: /download model/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('download_model_file', expect.any(Object));
      expect(screen.getByRole('button', { name: /download model/i })).toBeDisabled();
    });

    expect(rejectDownload).toBeTruthy();
    rejectDownload!(new Error('Download failed'));

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /download model/i });
      expect(btn).not.toBeDisabled();
      expect(toast.error).toHaveBeenCalledWith("Download failed. Ensure your HuggingFace Token is valid.");
    });
  });
});
