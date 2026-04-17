import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
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
    localStorage.clear();
    const tauriApi = await import('@tauri-apps/api/core');
    invokeMock = tauriApi.invoke as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers embedding job error and logs to console', async () => {
    const errorMsg = 'embedding job failed';

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'ensure_default_knowledge_dir') return Promise.resolve('/fake/path');
      if (cmd === 'index_local_folder') return Promise.resolve();
      if (cmd === 'trigger_embedding_job') return Promise.reject(new Error(errorMsg));
      return Promise.resolve();
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <LanguageProvider>
          <WindowProvider>
            <MainDesktop />
          </WindowProvider>
        </LanguageProvider>
      );
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
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
