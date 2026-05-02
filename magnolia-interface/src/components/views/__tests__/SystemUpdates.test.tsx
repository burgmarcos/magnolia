import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, type Mock } from 'vitest';
import { SystemUpdates } from '../SystemUpdates';

// Mock the Tauri api
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return { invoke: mockInvoke, default: { invoke: mockInvoke } };
});

describe('SystemUpdates', () => {
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
          update_version: '',
          update_progress: 0,
        });
      }
      if (cmd === 'discover_update_peers') {
        return Promise.resolve([]);
      }
      return Promise.resolve();
    });
  });

  it('renders loading state initially', async () => {
    let resolveStatus: (value: unknown) => void;
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_system_update_status') {
        return new Promise(resolve => {
          resolveStatus = resolve;
        });
      }
      return Promise.resolve();
    });

    render(<SystemUpdates />);

    expect(screen.getByText('Checking for updates...')).toBeInTheDocument();

    await act(async () => {
      resolveStatus!({
        current_partition: 'A',
        next_partition: 'B',
        update_available: false,
        update_version: '',
        update_progress: 0,
      });
    });

    expect(screen.queryByText('Checking for updates...')).not.toBeInTheDocument();
  });

  it('renders system up to date state', async () => {
    await act(async () => {
      render(<SystemUpdates />);
    });

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Standby: B')).toBeInTheDocument();
    expect(screen.getByText('System is up to date')).toBeInTheDocument();
  });

  it('renders update available state and handles installation', async () => {
    vi.useFakeTimers();

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_system_update_status') {
        return Promise.resolve({
          current_partition: 'A',
          next_partition: 'B',
          update_available: true,
          update_version: '1.2.0',
          update_progress: 0,
        });
      }
      if (cmd === 'apply_system_update') {
        return Promise.resolve();
      }
      return Promise.resolve();
    });

    await act(async () => {
      render(<SystemUpdates />);
    });

    expect(screen.getByText('Update Available: 1.2.0')).toBeInTheDocument();

    // Click install
    const installBtn = screen.getByText('Install Now');

    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(invokeMock).toHaveBeenCalledWith('apply_system_update');

    // Check progress text
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText(/Downloading Image\.\.\./)).toBeInTheDocument();

    await act(async () => {
      vi.runAllTimers();
    });

    vi.useRealTimers();
  });

  it('handles apply update failure', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_system_update_status') {
        return Promise.resolve({
          current_partition: 'A',
          next_partition: 'B',
          update_available: true,
          update_version: '1.2.0',
          update_progress: 0,
        });
      }
      if (cmd === 'apply_system_update') {
        return Promise.reject(new Error('Update error'));
      }
      return Promise.resolve();
    });

    await act(async () => {
      render(<SystemUpdates />);
    });

    const installBtn = screen.getByText('Install Now');

    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(console.error).toHaveBeenCalledWith('Update failed:', expect.any(Error));
    // Install Now should be back
    expect(screen.getByText('Install Now')).toBeInTheDocument();
  });

  it('toggles P2P sharing and displays peers', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'get_system_update_status') {
        return Promise.resolve({
          current_partition: 'A',
          next_partition: 'B',
          update_available: false,
          update_version: '',
          update_progress: 0,
        });
      }
      if (cmd === 'discover_update_peers') {
        return Promise.resolve([
          { hostname: 'node-1', ip: '192.168.1.10', version: '1.2.0' }
        ]);
      }
      return Promise.resolve();
    });

    await act(async () => {
      render(<SystemUpdates />);
    });

    const toggleBtn = screen.getByText('OFF');

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByText('SHARING')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('node-1')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.10 • Available: 1.2.0')).toBeInTheDocument();
    });

    // Toggle off
    const sharingBtn = screen.getByText('SHARING');
    await act(async () => {
      fireEvent.click(sharingBtn);
    });

    expect(screen.getByText('OFF')).toBeInTheDocument();
  });
});
