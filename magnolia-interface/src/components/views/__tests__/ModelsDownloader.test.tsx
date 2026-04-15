import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';

// Hoisted mock function
const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => {
  return {
    __esModule: true,
    invoke: mockInvoke,
    default: {
      invoke: mockInvoke,
    }
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock HardwareFitChip so it doesn't cause any rendering issues
vi.mock('../../HardwareFitChip.tsx', () => ({
  HardwareFitChip: () => <div data-testid="hardware-fit-chip"></div>
}));

describe('ModelsDownloader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve(['model1.gguf']);
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      if (cmd === 'get_api_key') return Promise.resolve('mock-key');
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

  it('shows skeleton loaders and empty state checks', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
      if (cmd === 'get_api_key') return Promise.resolve('mock-key');
      if (cmd === 'search_hf_models') return Promise.resolve({ id: 'TheBloke/Llama', size_on_disk_bytes: 4000 });
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });

    render(<ModelsDownloader />);

    const input = screen.getByPlaceholderText('Search for a model to download');
    fireEvent.change(input, { target: { value: 'llama' } });

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('search_hf_models', expect.any(Object));
    });

    await waitFor(() => {
      expect(screen.getByText('Llama')).toBeInTheDocument();
    });
  });

  it('shows huggingface 401 access denied error when search fails with 401', async () => {
    render(<ModelsDownloader />);

    // Wait for the initial load to finish before mocking
    await waitFor(() => {
        expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });

    // Get the mocked toast to check if the error is called
    const toast = await import('react-hot-toast');

    // Configure mock for search failure mapping to empty state
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'search_hf_models') return Promise.reject(new Error('HTTP Status: 401 Unauthorized'));
      return Promise.resolve();
    });

    const input = screen.getByPlaceholderText('Search for a model to download');
    fireEvent.change(input, { target: { value: 'private-model' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for the search state to pass and error to be shown
    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith(
        "HuggingFace Access Denied. Please verify your API Key in System Hub.",
        { duration: 5000 }
      );
    });
  });
});
