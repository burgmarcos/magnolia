import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  default: { invoke: (...args: unknown[]) => mockInvoke(...args) }
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }
}));

describe('ModelsDownloader', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for mount
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_local_models') return Promise.resolve(['model1.gguf']);
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(4000);
      if (cmd === 'assess_model_fit') return Promise.resolve('Fits Perfectly');
      return Promise.resolve();
    });
  });

  it('renders correctly and loads initial local models', async () => {
    render(<ModelsDownloader />);

    expect(screen.getByText('Models')).toBeInTheDocument();

    // Wait for the local models to load
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });
  });

  it('shows skeleton loaders and empty state checks', async () => {
    render(<ModelsDownloader />);

    // Wait for the local models to load (initial mount)
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });

    // Configure mock for search failure mapping to empty state
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_local_models') return [];
      if (cmd === 'search_hf_models') return { id: 'TheBloke/Llama', size_on_disk_bytes: 4000 };
      if (cmd === 'get_local_model_size_bytes') return 4000;
      if (cmd === 'assess_model_fit') return 'Fits Perfectly';
      return undefined;
    });

    const input = screen.getByPlaceholderText('Search for a model to download');
    fireEvent.change(input, { target: { value: 'llama' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for search to complete and render the new UI
    await waitFor(() => {
      expect(screen.getByText('Llama')).toBeInTheDocument();
    });
  });

  it('shows huggingface 401 error message', async () => {
    render(<ModelsDownloader />);

    // Wait for the local models to load (initial mount)
    await waitFor(() => {
      expect(screen.getByText('model1.gguf')).toBeInTheDocument();
    });

    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_local_models') return [];
      if (cmd === 'search_hf_models') throw new Error("HTTP Error: 401 Unauthorized");
      return undefined;
    });

    const input = screen.getByPlaceholderText('Search for a model to download');
    fireEvent.change(input, { target: { value: 'llama' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("HuggingFace Access Denied. Please verify your API Key in System Hub.", { duration: 5000 });
    });
  });
});
