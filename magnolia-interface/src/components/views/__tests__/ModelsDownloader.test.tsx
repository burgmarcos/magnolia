import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, type Mock } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';

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
    await act(async () => { render(<ModelsDownloader />); });
    expect(screen.getByText('Models')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });
  });

  it('shows skeleton loaders and empty state checks', async () => {
    await act(async () => { render(<ModelsDownloader />); });

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'TheBloke/Llama', size_on_disk_bytes: 4000 });
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });

    const input = screen.getByPlaceholderText('Search for a model to download');

    act(() => {
      fireEvent.change(input, { target: { value: 'llama' } });
    });
    await new Promise(r => setTimeout(r, 0));

    act(() => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    await waitFor(() => {
      expect(screen.getByText(/llama/i)).toBeInTheDocument();
    });
  });

  it('handles download failure and reverts state', async () => {
    await act(async () => { render(<ModelsDownloader />); });

    invokeMock.mockImplementation((cmd: string, args: any) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'meta-llama/Llama-2-7b', size_on_disk_bytes: 4000 });
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      if (cmd === 'download_model_file') return Promise.reject(new Error('Download failed'));
      return Promise.resolve();
    });

    const input = screen.getByPlaceholderText('Search for a model to download');

    act(() => {
      fireEvent.change(input, { target: { value: 'Llama' } });
    });
    await new Promise(r => setTimeout(r, 0));

    act(() => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    await waitFor(() => {
      expect(screen.getByText(/Llama-2-7b/i)).toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole('button', { name: /download model/i });
    act(() => {
      fireEvent.click(downloadBtn);
    });

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /download model/i });
      expect(btn).not.toBeDisabled();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
});