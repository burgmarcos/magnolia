import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { MainDesktop } from '../MainDesktop';
import { WindowProvider } from '../../../contexts/WindowContext';
import { LanguageProvider } from '../../../context/LanguageContext';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../../layout/DesktopEnvironment', () => ({
  DesktopEnvironment: ({ children }: { children: React.ReactNode }) => <div data-testid="desktop-env">{children}</div>
}));

vi.mock('../../layout/XRNavigationBar', () => ({
  XRNavigationBar: () => <div data-testid="xr-navigation-bar" />
}));

vi.mock('../../layout/XRAppBar', () => ({
  XRAppBar: ({ onOpenProfile }: { onOpenProfile?: () => void }) => (
    <button data-testid="open-profile" onClick={onOpenProfile}>
      Open Profile
    </button>
  )
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
    try {
      render(
        <LanguageProvider>
          <WindowProvider>
            <MainDesktop onLogout={onLogoutMock} />
          </WindowProvider>
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(invokeMock).toHaveBeenCalledWith('load_session', expect.any(Object));
      });

      fireEvent.click(screen.getByTestId('open-profile'));

      const logoutBtn = await screen.findByText('Logout & Exit');
      fireEvent.click(logoutBtn);

      await waitFor(() => {
        expect(invokeMock).toHaveBeenCalledWith('save_session', expect.any(Object));
        expect(consoleSpy).toHaveBeenCalledWith('Session archival failed during logout:', expect.any(Error));
        expect(onLogoutMock).toHaveBeenCalled();
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
