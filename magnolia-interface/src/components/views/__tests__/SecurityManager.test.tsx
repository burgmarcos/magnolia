import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { SecurityManager } from '../SecurityManager.tsx';
import { toast } from 'react-hot-toast';

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// We must also mock react-hot-toast otherwise it might complain
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('SecurityManager', () => {
  let invokeMock: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    // @ts-expect-error - Mocking Tauri invoke
    invokeMock = tauriApi.invoke;

    // Default mock implementation
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_security_status') {
        return Promise.resolve([
          { label: 'data_partition', is_encrypted: true, is_locked: true, mount_point: '/mnt/data' }
        ]);
      }
      return Promise.resolve();
    });
  });

  it('handles unlock error path correctly', async () => {
    // Configure mock for unlock_partition to simulate an error
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_security_status') {
        return Promise.resolve([
          { label: 'data_partition', is_encrypted: true, is_locked: true, mount_point: '/mnt/data' }
        ]);
      }
      if (cmd === 'unlock_partition') {
        return Promise.reject('Invalid password');
      }
      return Promise.resolve();
    });

    render(<SecurityManager />);

    // Wait for the partition list to load
    await waitFor(() => {
      expect(screen.getByText('data_partition')).toBeInTheDocument();
    });

    // Click Unlock button
    const unlockBtn = screen.getByRole('button', { name: 'Unlock' });
    fireEvent.click(unlockBtn);

    // Enter password
    const passwordInput = screen.getByPlaceholderText('Master Partition Key');
    fireEvent.change(passwordInput, { target: { value: 'wrong_password' } });

    // Click Mount Partition
    const mountBtn = screen.getByRole('button', { name: 'Mount Partition' });
    fireEvent.click(mountBtn);

    // Wait for the error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid password');
    });
  });
});
