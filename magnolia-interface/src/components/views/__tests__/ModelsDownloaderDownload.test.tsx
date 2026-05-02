import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll} from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn()
}));

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => ({
  __esModule: true,
  invoke: mockInvoke,
  default: { invoke: mockInvoke }
}));

const { mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

// We must also mock react-hot-toast otherwise it might complain
vi.mock('react-hot-toast', () => ({
  default: {
    success: mockToastSuccess,
    error: mockToastError,
  },
  success: mockToastSuccess,
  error: mockToastError,
}));

describe('ModelsDownloader - Download Models', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();

    // Default mock implementation for mount
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_all_local_models_info') return Promise.resolve([]);
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'TheBloke/Llama', size_on_disk_bytes: 4000 });
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });
  });

  it('downloads a model successfully', async () => {
    await act(async () => {
      render(<ModelsDownloader />);
    });

    const input = screen.getByPlaceholderText('Search for a model to download');
    fireEvent.change(input, { target: { value: 'llama' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for search to complete
    await waitFor(() => {
      expect(screen.getByText('Llama')).toBeInTheDocument();
    });

    // Mock download success
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'download_model_file') return Promise.resolve();
      return Promise.resolve();
    });

    const downloadButton = screen.getByLabelText('Download Model');

    await act(async () => {
        fireEvent.click(downloadButton);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('download_model_file', expect.any(Object));
      expect(mockToastSuccess).toHaveBeenCalledWith('Llama downloaded successfully!');
    });
  });

  it('handles download failure', async () => {
    await act(async () => {
      render(<ModelsDownloader />);
    });

    const input = screen.getByPlaceholderText('Search for a model to download');
    fireEvent.change(input, { target: { value: 'llama' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for search to complete
    await waitFor(() => {
      expect(screen.getByText('Llama')).toBeInTheDocument();
    });

    // Mock download failure
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'download_model_file') return Promise.reject(new Error('Download failed'));
      return Promise.resolve();
    });

    const downloadButton = screen.getByLabelText('Download Model');

    await act(async () => {
        fireEvent.click(downloadButton);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('download_model_file', expect.any(Object));
      expect(mockToastError).toHaveBeenCalledWith('Download failed. Ensure your HuggingFace Token is valid.');
    });
  });
});
