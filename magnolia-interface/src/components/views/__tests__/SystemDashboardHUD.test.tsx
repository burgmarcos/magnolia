import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from 'vitest';
import { SystemDashboardHUD } from '../SystemDashboardHUD';

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return { invoke: mockInvoke, default: { invoke: mockInvoke } };
});

describe('SystemDashboardHUD', () => {
  let invokeMock: Mock;

  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    // @ts-expect-error - Mocking Tauri invoke
    invokeMock = tauriApi.invoke;

    // Default mock implementation
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_system_update_status') {
        return Promise.resolve({
          current_partition: 'A',
          next_partition: 'B',
          update_available: false,
          update_version: '1.0.0'
        });
      }
      if (cmd === 'get_security_status') {
        return Promise.resolve([
          {
            label: 'OS Root',
            is_encrypted: true,
            is_locked: false,
            mount_point: '/'
          }
        ]);
      }
      return Promise.resolve();
    });
  });

  it('renders loading state initially', async () => {
    // Return unresolved promises to keep it in loading state
    invokeMock.mockImplementation(() => new Promise(() => {}));

    render(<SystemDashboardHUD />);

    expect(screen.getByText('Synchronizing Magnolia Core...')).toBeInTheDocument();
  });

  it('fetches data and renders the HUD correctly', async () => {
    await act(async () => {
      render(<SystemDashboardHUD />);
    });

    await waitFor(() => {
      // Check for main heading
      expect(screen.getByText('System HUD')).toBeInTheDocument();
      expect(screen.getByText('Real-time Magnolia Node Diagnostics')).toBeInTheDocument();
    });

    // Check for metric cards
    expect(screen.getByText('Compute Load')).toBeInTheDocument();
    expect(screen.getByText('Memory Pool')).toBeInTheDocument();
    expect(screen.getByText('System Partition')).toBeInTheDocument();

    // Check for security matrix
    expect(screen.getByText('Security Matrix')).toBeInTheDocument();
    expect(screen.getByText('OS Root')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();

    // Check for updates
    expect(screen.getByText('Update Failover Status')).toBeInTheDocument();
    expect(screen.getByText('OS Baseline Immutable & Verified')).toBeInTheDocument();
    expect(screen.getByText('Partition A')).toBeInTheDocument();
    expect(screen.getByText('Partition B')).toBeInTheDocument();
  });

  it('renders update available state correctly', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_system_update_status') {
        return Promise.resolve({
          current_partition: 'A',
          next_partition: 'B',
          update_available: true,
          update_version: '2.0.0'
        });
      }
      if (cmd === 'get_security_status') {
        return Promise.resolve([]);
      }
      return Promise.resolve();
    });

    await act(async () => {
      render(<SystemDashboardHUD />);
    });

    await waitFor(() => {
      expect(screen.getByText('v2.0.0 Released')).toBeInTheDocument();
      expect(screen.getByText('Trigger Update')).toBeInTheDocument();
    });
  });

  it('handles data fetch error gracefully', async () => {
    invokeMock.mockImplementation(() => Promise.reject(new Error('Fetch failed')));

    await act(async () => {
      render(<SystemDashboardHUD />);
    });

    await waitFor(() => {
      expect(screen.getByText('System HUD')).toBeInTheDocument();
    });

    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('Failed to sync system HUD:', expect.any(Error));
  });
});
