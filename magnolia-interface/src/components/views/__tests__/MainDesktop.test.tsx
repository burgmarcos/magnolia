import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { MainDesktop } from '../MainDesktop.tsx';
import { WindowProvider } from '../../../contexts/WindowContext';
import { LanguageProvider } from '../../../context/LanguageContext';
import { PreferencesProvider } from '../../../context/PreferencesContext';

// Mock Tauri api
vi.mock('@tauri-apps/api/core', () => {
  const mockInvoke = vi.fn();
  return {
    invoke: mockInvoke,
    default: { invoke: mockInvoke }
  };
});

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockReturnValue(Promise.resolve(vi.fn()))
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => <div data-testid="toaster" />
}));

describe('MainDesktop', () => {
  let invokeMock: Mock;

  it('renders successfully', async () => {
    const mockOnLogout = vi.fn();
    await renderDesktop(mockOnLogout);

    // Check if basic structure is there (e.g. by looking for something that is always rendered)
    // The component has Toaster which has a data-testid
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });


  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    invokeMock = tauriApi.invoke as Mock;

    // Default implementation returns sensible empty values
    invokeMock.mockImplementation((cmd) => {
      if (cmd === 'get_local_models') return Promise.resolve([]);
      if (cmd === 'get_local_model_size_bytes') return Promise.resolve(0);
      return Promise.resolve();
    });

    // Silence error logs
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const renderDesktop = async (mockOnLogout: Mock) => {
    await act(async () => {
      render(
        <PreferencesProvider>
          <LanguageProvider>
            <WindowProvider>
              <MainDesktop onLogout={mockOnLogout} />
            </WindowProvider>
          </LanguageProvider>
        </PreferencesProvider>
      );
    });
  };

  it('handles save_session failure gracefully during logout', async () => {
    const mockOnLogout = vi.fn();

    // Mock the invoke call to fail when saving session
    invokeMock.mockImplementation((cmd) => {
      if (cmd === 'save_session') {
        return Promise.reject(new Error('Test failure'));
      }
      if (cmd === 'get_local_models') return Promise.resolve([]);
      return Promise.resolve();
    });

    await renderDesktop(mockOnLogout);

    // Find the profile button by its container class structure
    const profileContainers = document.querySelectorAll('div[class*="leadingIcon"]');
    expect(profileContainers.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(profileContainers[0]);
    });

    // Find and click the logout button
    const logoutButton = screen.getByText('Logout & Exit');

    await act(async () => {
      fireEvent.click(logoutButton);
    });

    // Wait for the async invoke inside logout to finish
    await waitFor(() => {
      // Assert invoke was called
      expect(invokeMock).toHaveBeenCalledWith('save_session', expect.anything());

      // Assert onLogout was still called despite the failure
      expect(mockOnLogout).toHaveBeenCalled();

      // Console error should have been called logging the failure
      expect(console.error).toHaveBeenCalledWith(
        "Session archival failed during logout:",
        expect.any(Error)
      );
    });
  });

  it('handles save_session success correctly during logout', async () => {
    const mockOnLogout = vi.fn();

    // Mock the invoke call to succeed when saving session
    invokeMock.mockImplementation((cmd) => {
      if (cmd === 'save_session') {
        return Promise.resolve();
      }
      if (cmd === 'get_local_models') return Promise.resolve([]);
      return Promise.resolve();
    });

    await renderDesktop(mockOnLogout);

    // Open profile menu
    const profileContainers = document.querySelectorAll('div[class*="leadingIcon"]');

    await act(async () => {
      fireEvent.click(profileContainers[0]);
    });

    // Find and click the logout button
    const logoutButton = screen.getByText('Logout & Exit');

    await act(async () => {
      fireEvent.click(logoutButton);
    });

    // Wait for the async invoke inside logout to finish
    await waitFor(() => {
      // Assert invoke was called
      expect(invokeMock).toHaveBeenCalledWith('save_session', expect.anything());

      // Assert onLogout was still called
      expect(mockOnLogout).toHaveBeenCalled();

      // Console error should not have been called for session failure
      expect(console.error).not.toHaveBeenCalledWith(
        "Session archival failed during logout:",
        expect.any(Error)
      );
    });
  });
});
