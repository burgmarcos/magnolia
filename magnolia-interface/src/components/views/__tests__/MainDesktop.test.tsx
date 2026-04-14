import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { MainDesktop } from '../MainDesktop';
import { WindowProvider } from '../../../contexts/WindowContext';
import { LanguageProvider } from '../../../context/LanguageContext';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../../desktop/DesktopEnvironment', () => ({
  DesktopEnvironment: ({ children }: { children: React.ReactNode }) => <div data-testid="desktop-env">{children}</div>
}));

vi.mock('../../desktop/XRNavigationBar', () => ({
  XRNavigationBar: () => <div data-testid="xr-navigation-bar" />
}));

describe('MainDesktop', () => {
  let invokeMock: Mock;
  const onLogoutMock = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import('@tauri-apps/api/core');
    invokeMock = tauriApi.invoke as Mock;
  });

  it('calls onLogout even if save_session fails', async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'save_session') return Promise.reject(new Error('save_session failed'));
      return Promise.resolve({ windows: [], configs: {} }); // Mock load_session response
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LanguageProvider>
        <WindowProvider>
          <MainDesktop onLogout={onLogoutMock} />
        </WindowProvider>
      </LanguageProvider>
    );

    // Give it a moment to hydrate
    await waitFor(() => {
        expect(invokeMock).toHaveBeenCalledWith('load_session', expect.any(Object));
    });

    // Profile icon is the first user icon inside XRAppBar
    const userIconSVG = document.querySelectorAll('svg.lucide-user')[0];
    if (userIconSVG && userIconSVG.parentElement) {
      fireEvent.click(userIconSVG.parentElement);
    }

    const logoutBtn = await screen.findByText('Logout & Exit');
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('save_session', expect.any(Object));
      expect(consoleSpy).toHaveBeenCalledWith('Session archival failed during logout:', expect.any(Error));
      expect(onLogoutMock).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
