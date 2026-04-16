import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

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
    await act(async () => { render(<ModelsDownloader />); });

    expect(screen.getByText('Models')).toBeInTheDocument();

    // Wait for the local models to load
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });
  });

  it('shows skeleton loaders and empty state checks', async () => {
    // Suppress console.error expected during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'TheBloke/Llama', size_on_disk_bytes: 4000 });
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });

    await act(async () => { render(<ModelsDownloader />); });

    const input = screen.getByPlaceholderText('Search for a model to download');
    fireEvent.change(input, { target: { value: 'llama' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for search to complete and render the new UI
    await waitFor(() => {
      expect(screen.getByText('Llama')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('handles download failure correctly', async () => {
    // Suppress console.error expected during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'Fail/Model', size_on_disk_bytes: 4000 });
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      if (cmd === 'download_model_file') return Promise.reject(new Error('Network error'));
      return Promise.resolve();
    });

    await act(async () => { render(<ModelsDownloader />); });

    // Search for a model
    const input = screen.getByPlaceholderText('Search for a model to download');
    fireEvent.change(input, { target: { value: 'model' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for model to appear in list
    await waitFor(() => {
      expect(screen.getByText('Model')).toBeInTheDocument();
    });

    // Find and click the download button
    const downloadBtn = screen.getByLabelText('Download Model');
    fireEvent.click(downloadBtn);

    const toast = await import('react-hot-toast');

    // Wait for the failure path to run
    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Download failed. Ensure your HuggingFace Token is valid.');
    });

    // Ensure the model status reverted to 'available'
    // Status available means the download button is enabled again
    expect(downloadBtn).not.toBeDisabled();

    // Clean up mock
    consoleSpy.mockRestore();
  });
});
