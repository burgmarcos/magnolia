import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from 'vitest';
import { StorageSettings } from '../StorageSettings';
import { toast } from 'react-hot-toast';

vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return { invoke: mockInvoke, default: { invoke: mockInvoke } };
});

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

describe('StorageSettings', () => {
  let invokeMock: Mock;

  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    // @ts-expect-error - Mocking Tauri invoke
    invokeMock = tauriApi.invoke;

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_disk_info') {
        return Promise.resolve([
          {
            name: '/dev/sda1',
            label: 'Data Partition',
            mount_point: '/data',
            total_space: 10000000000,
            used_space: 5000000000,
            free_space: 5000000000,
            is_removable: false,
            is_locked: false,
            expansion_pending: false,
            filesystem: 'ext4'
          }
        ]);
      }
      return Promise.resolve();
    });
  });

  it('renders disk information correctly', async () => {
    await act(async () => {
      render(<StorageSettings />);
    });

    expect(screen.getByText('Data Partition')).toBeInTheDocument();
    expect(screen.getByText('EXT4 • Core Storage')).toBeInTheDocument();
    expect(screen.getByText('Mounted at: /data')).toBeInTheDocument();
    expect(screen.getByText('Unmount')).toBeInTheDocument();
  });

  it('handles unmount action successfully without confirmation modal', async () => {
    await act(async () => {
      render(<StorageSettings />);
    });

    const unmountButton = screen.getByText('Unmount');

    await act(async () => {
      fireEvent.click(unmountButton);
    });

    expect(invokeMock).toHaveBeenCalledWith('manage_partition', { name: '/dev/sda1', action: 'Unmount' });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Unmount successful on /dev/sda1');
    });
  });

  it('handles format action by showing confirmation modal', async () => {
    await act(async () => {
      render(<StorageSettings />);
    });

    const formatButton = screen.getByText('Format');

    await act(async () => {
      fireEvent.click(formatButton);
    });

    // The modal should now be open. Wait for text that indicates confirmation modal
    expect(screen.getByText('Confirm Format Operation')).toBeInTheDocument();

    const pinInput = screen.getByPlaceholderText('Enter 4-digit PIN');
    const usernameInput = screen.getByPlaceholderText('Type username exactly');
    const confirmButton = screen.getByText('Confirm & Format');

    // Button should be disabled initially
    expect(confirmButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(pinInput, { target: { value: '1234' } });
      fireEvent.change(usernameInput, { target: { value: 'admin' } });
    });

    expect(confirmButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(invokeMock).toHaveBeenCalledWith('verify_security_action', { pin: '1234', userConfirm: 'admin' });
    expect(invokeMock).toHaveBeenCalledWith('manage_partition', { name: '/dev/sda1', action: 'Format' });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Format successful on /dev/sda1');
    });
  });
});
