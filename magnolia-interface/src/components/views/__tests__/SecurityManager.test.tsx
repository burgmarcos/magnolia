import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from 'vitest';
import { SecurityManager } from '../SecurityManager';
import { toast } from 'react-hot-toast';

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return { invoke: mockInvoke, default: { invoke: mockInvoke } };
});

// Mock toast
vi.mock('react-hot-toast', () => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };
  return {
    default: mockToast,
    toast: mockToast,
  };
});

describe('SecurityManager', () => {
  let invokeMock: Mock;

  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    // @ts-expect-error - Mocking Tauri invoke
    invokeMock = tauriApi.invoke;

    // Default mock implementation for mount
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_security_status') {
        return Promise.resolve([
          {
            label: 'Data Partition',
            is_encrypted: true,
            is_locked: true,
            mount_point: '/data'
          }
        ]);
      }
      return Promise.resolve();
    });
  });

  it('shows error when unlock_partition fails', async () => {
    await act(async () => {
      render(<SecurityManager />);
    });

    // Click unlock
    fireEvent.click(screen.getByText('Unlock'));

    // Type password
    const passwordInput = screen.getByPlaceholderText('Master Partition Key');
    fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });

    // Mock unlock failure
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_security_status') {
        return Promise.resolve([{ label: 'Data Partition', is_encrypted: true, is_locked: true, mount_point: '/data' }]);
      }
      if (cmd === 'unlock_partition') {
        return Promise.reject('Invalid password or corrupted header');
      }
      return Promise.resolve();
    });

    // Click Mount Partition
    await act(async () => {
      fireEvent.click(screen.getByText('Mount Partition'));
    });

    expect(toast.error).toHaveBeenCalledWith('Invalid password or corrupted header');
  });

  it('shows error when no password entered', async () => {
    await act(async () => {
      render(<SecurityManager />);
    });

    // Click unlock
    fireEvent.click(screen.getByText('Unlock'));

    // Leave password empty, click Mount Partition
    await act(async () => {
      fireEvent.click(screen.getByText('Mount Partition'));
    });

    expect(toast.error).toHaveBeenCalledWith('Please enter a password');
  });

  it('successfully unlocks partition', async () => {
    await act(async () => {
      render(<SecurityManager />);
    });

    // Click unlock
    fireEvent.click(screen.getByText('Unlock'));

    // Type password
    const passwordInput = screen.getByPlaceholderText('Master Partition Key');
    fireEvent.change(passwordInput, { target: { value: 'correct-password' } });

    // Mock unlock success
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_security_status') {
        return Promise.resolve([{ label: 'Data Partition', is_encrypted: true, is_locked: false, mount_point: '/data' }]);
      }
      if (cmd === 'unlock_partition') {
        return Promise.resolve();
      }
      return Promise.resolve();
    });

    // Click Mount Partition
    await act(async () => {
      fireEvent.click(screen.getByText('Mount Partition'));
    });

    expect(toast.success).toHaveBeenCalledWith('Data Partition unlocked and mounted');
    // Verify it changed to unlocked state
    await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });
});
