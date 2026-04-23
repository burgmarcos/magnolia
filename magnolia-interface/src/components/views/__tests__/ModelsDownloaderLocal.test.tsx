import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { ModelsDownloader } from '../ModelsDownloader.tsx';
import toast from 'react-hot-toast';

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

describe('ModelsDownloader - Local Models', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for mount
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_all_local_models_info') return Promise.resolve([{ name: 'model1.gguf', fit_status: 'Fits Perfectly' }]);
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

  it('shows error toast when failing to load local models', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_all_local_models_info') return Promise.reject(new Error('Network error'));
      return Promise.resolve();
    });

    const toastErrorSpy = vi.spyOn(toast, 'error');

    await act(async () => {
      render(<ModelsDownloader />);
    });

    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load local models: Error: Network error'));
    });
  });
});
