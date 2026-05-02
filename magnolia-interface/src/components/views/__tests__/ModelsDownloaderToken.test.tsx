import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
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

describe('ModelsDownloader - Token Validation', () => {
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
      return Promise.resolve();
    });
  });

  it('verifies token successfully', async () => {
    await act(async () => {
      render(<ModelsDownloader />);
    });

    // Toggle the key input visibility

    // Find the button with the Key icon. Note: This relies on the internal structure or we could be more specific.
    // It's the button before the "Get Token" button.
    const buttons = screen.getAllByRole('button');
    // Find the one that's likely the key button based on its structure
    const keyToggleBtn = buttons.find(btn => btn.innerHTML.includes('lucide-key'));
    if (keyToggleBtn) {
        fireEvent.click(keyToggleBtn);
    }

    // Now wait for the input to appear
    const input = screen.getByPlaceholderText('hf_...');
    fireEvent.change(input, { target: { value: 'hf_test_token' } });

    // Mock verification success
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'verify_hf_token') return Promise.resolve('Token valid!');
      return Promise.resolve();
    });

    const verifyButton = screen.getByTitle('Verify Token');

    await act(async () => {
        fireEvent.click(verifyButton);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('verify_hf_token', { token: 'hf_test_token' });
      expect(mockToastSuccess).toHaveBeenCalledWith('Token valid!');
    });
  });

  it('handles token verification failure', async () => {
    await act(async () => {
      render(<ModelsDownloader />);
    });

    const buttons = screen.getAllByRole('button');
    const keyToggleBtn = buttons.find(btn => btn.innerHTML.includes('lucide-key'));
    if (keyToggleBtn) {
        fireEvent.click(keyToggleBtn);
    }

    const input = screen.getByPlaceholderText('hf_...');
    fireEvent.change(input, { target: { value: 'hf_invalid_token' } });

    // Mock verification failure
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'verify_hf_token') return Promise.reject(new Error('Invalid token'));
      return Promise.resolve();
    });

    const verifyButton = screen.getByTitle('Verify Token');

    await act(async () => {
        fireEvent.click(verifyButton);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('verify_hf_token', { token: 'hf_invalid_token' });
      expect(mockToastError).toHaveBeenCalledWith('Validation Failed: Error: Invalid token');
    });
  });

  it('saves token successfully', async () => {
    await act(async () => {
      render(<ModelsDownloader />);
    });

    const buttons = screen.getAllByRole('button');
    const keyToggleBtn = buttons.find(btn => btn.innerHTML.includes('lucide-key'));
    if (keyToggleBtn) {
        fireEvent.click(keyToggleBtn);
    }

    const input = screen.getByPlaceholderText('hf_...');
    fireEvent.change(input, { target: { value: 'hf_test_token' } });

    // Mock save success
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'set_api_key') return Promise.resolve();
      return Promise.resolve();
    });

    const saveButton = screen.getByTitle('Save Token');

    await act(async () => {
        fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('set_api_key', { service: 'huggingface', key: 'hf_test_token' });
      expect(mockToastSuccess).toHaveBeenCalledWith('Key saved securely');
    });
  });
});
