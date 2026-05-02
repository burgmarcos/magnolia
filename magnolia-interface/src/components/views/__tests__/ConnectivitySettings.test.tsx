import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ConnectivitySettings } from '../ConnectivitySettings';
import { LanguageProvider } from '../../../context/LanguageContext';

// Mock Tauri api
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return {
    invoke: mockInvoke,
    default: { invoke: mockInvoke }
  };
});

describe('ConnectivitySettings', () => {
  let invokeMock: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    invokeMock = tauriApi.invoke as Mock;
  });

  const renderComponent = async () => {
    await act(async () => {
      render(
        <LanguageProvider>
          <ConnectivitySettings />
        </LanguageProvider>
      );
    });
  };

  it('renders scanning state initially', async () => {
    // Return unresolved promises to keep it in scanning state during the initial render
    let resolveWifi: (value: unknown) => void;
    let resolveBt: (value: unknown) => void;

    const wifiPromise = new Promise(resolve => { resolveWifi = resolve; });
    const btPromise = new Promise(resolve => { resolveBt = resolve; });

    invokeMock.mockImplementation((cmd) => {
      if (cmd === 'scan_wifi') return wifiPromise;
      if (cmd === 'scan_bluetooth') return btPromise;
      return Promise.resolve();
    });

    await renderComponent();

    expect(screen.getByText('Scanning radios...')).toBeInTheDocument();

    // Resolve the promises to clean up
    await act(async () => {
      resolveWifi!([]);
      resolveBt!([]);
    });
  });

  it('displays error if wifi scan fails', async () => {
    invokeMock.mockImplementation((cmd) => {
      if (cmd === 'scan_wifi') return Promise.reject(new Error('Wifi hardware not found'));
      if (cmd === 'scan_bluetooth') return Promise.resolve([]);
      return Promise.resolve();
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Scan failed: Error: Wifi hardware not found')).toBeInTheDocument();
    });
  });

  it('displays wifi networks and bluetooth devices on success', async () => {
    invokeMock.mockImplementation((cmd) => {
      if (cmd === 'scan_wifi') {
        return Promise.resolve([
          { ssid: 'Home Network', strength: 80 },
          { ssid: 'Coffee Shop', strength: 40 }
        ]);
      }
      if (cmd === 'scan_bluetooth') {
        return Promise.resolve([
          { name: 'Headphones', mac: '00:11:22:33:44:55' },
          { name: 'Mouse', mac: 'AA:BB:CC:DD:EE:FF' }
        ]);
      }
      return Promise.resolve();
    });

    await renderComponent();

    await waitFor(() => {
      // Check Wifi networks
      expect(screen.getByText('Home Network')).toBeInTheDocument();
      expect(screen.getByText('Coffee Shop')).toBeInTheDocument();

      // Check Bluetooth devices
      expect(screen.getByText('Headphones')).toBeInTheDocument();
      expect(screen.getByText('00:11:22:33:44:55')).toBeInTheDocument();
      expect(screen.getByText('Mouse')).toBeInTheDocument();
      expect(screen.getByText('AA:BB:CC:DD:EE:FF')).toBeInTheDocument();

      // Should not show scanning text or errors
      expect(screen.queryByText('Scanning radios...')).not.toBeInTheDocument();
      expect(screen.queryByText(/Scan failed/)).not.toBeInTheDocument();
    });
  });

  it('displays message when no bluetooth devices found', async () => {
    invokeMock.mockImplementation((cmd) => {
      if (cmd === 'scan_wifi') {
        return Promise.resolve([]);
      }
      if (cmd === 'scan_bluetooth') {
        return Promise.resolve([]);
      }
      return Promise.resolve();
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No active Bluetooth controllers detected in Udev bounds.')).toBeInTheDocument();
    });
  });
});
