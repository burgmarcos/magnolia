import { useState, useEffect, lazy, type ComponentType } from 'react';
import { extractThemeFromImage } from '../../utils/theme';
import { DesktopEnvironment } from '../layout/DesktopEnvironment';
import { XRAppBar } from '../layout/XRAppBar';
import { AppWindow } from '../AppWindow';
import { XRNavigationBar } from '../layout/XRNavigationBar';
import { AppsDrawer } from '../layout/AppsDrawer';
import { NotificationsPanel } from '../layout/NotificationsPanel';
import { GlobalSearchOverlay } from '../layout/GlobalSearchOverlay';
import { 
  Settings, MessageSquare, Info, CloudRain, CalendarDays, 
  Calculator, Globe, FolderOpen, FileText, Package, Clock, Music 
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { useWindows } from '../../contexts/WindowContext';
import type { WindowType } from '../../contexts/WindowContext';
import { ProfileMenu } from './ProfileMenu';
import { WindowContentRenderer } from './WindowContentRenderer';
import { SettingsRouter, type SettingsRoute } from './SettingsRouter';

const SystemUpdatesView = lazy(() => import('./SystemUpdates.tsx').then(m => ({ default: m.SystemUpdates })));
import { SettingsLayout } from '../layout/SettingsLayout';

type NavTabRoute = 'apps' | 'home' | 'updates';

const WINDOW_METADATA: Record<string, { icon: ComponentType<{ size?: number; color?: string }>, color: string }> = {
  chat: { icon: MessageSquare, color: '#3A7BD5' },
  browser: { icon: Globe, color: '#4285F4' },
  appstore: { icon: Package, color: '#BA68C8' },
  files: { icon: FolderOpen, color: '#FFA000' },
  editor: { icon: FileText, color: '#546E7A' },
  calculator: { icon: Calculator, color: '#43A047' },
  settings: { icon: Settings, color: '#7E57C2' },
  weather: { icon: CloudRain, color: '#03A9F4' },
  calendar: { icon: CalendarDays, color: '#EF5350' },
  about: { icon: Info, color: '#607D8B' },
  clock: { icon: Clock, color: '#263238' },
  media: { icon: Music, color: '#E91E63' },
  pdf: { icon: FileText, color: '#F44336' },
};

export const MainDesktop = ({ onLogout }: { onLogout?: () => void }) => {
  const { activeWindows, windowConfigs, openWindow, closeWindow, toggleMinimize } = useWindows();
  
  const [activeSettingsView, setActiveSettingsView] = useState<SettingsRoute>('general');
  const [activeNavTab, setActiveNavTab] = useState<NavTabRoute>('home');
  const [wallpaper, setWallpaper] = useState<string | undefined>(() => {
    // Initialize state directly from localStorage to avoid setting state in effect
    const saved = localStorage.getItem('Magnolia-wallpaper');
    return saved || undefined;
  });
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Dynamic Theme Engine
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    
    if (wallpaper) {
      extractThemeFromImage(wallpaper).then(theme => {
        const root = document.documentElement;
        root.style.setProperty('--schemes-primary', theme.primary);
        root.style.setProperty('--schemes-on-primary', theme.onPrimary);
        root.style.setProperty('--schemes-primary-container', theme.primaryContainer);
        root.style.setProperty('--schemes-on-primary-container', theme.onPrimaryContainer);
        root.style.setProperty('--schemes-secondary', theme.secondary);
        root.style.setProperty('--schemes-surface', theme.surface);
        root.style.setProperty('--primary-rgb', theme.rgb);
      });
    }

    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [wallpaper]);

  const handleSetWallpaper = (url: string) => {
    setWallpaper(url);
    localStorage.setItem('Magnolia-wallpaper', url);
  };

  useEffect(() => {
    const handleOpenApp = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, title, ...config } = customEvent.detail;
      openWindow(type as WindowType, title, config);
    };

    window.addEventListener('Magnolia-open-app', handleOpenApp);
    return () => window.removeEventListener('Magnolia-open-app', handleOpenApp);
  }, [openWindow]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <DesktopEnvironment wallpaper={wallpaper}>
      <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--schemes-surface-container-high, #ECE6F0)', color: 'var(--schemes-on-surface, #1D1B20)' } }} />
      <XRAppBar 
        onOpenSearch={() => setShowSearch(true)}
        onOpenNotifications={() => setShowNotifications(true)} 
        onOpenProfile={() => setShowProfileMenu(!showProfileMenu)}
      />

      {showProfileMenu && (
        <ProfileMenu onClose={() => setShowProfileMenu(false)} onLogout={onLogout} />
      )}
      
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}

      <AnimatePresence>
        {showSearch && (
          <GlobalSearchOverlay 
            onClose={() => setShowSearch(false)} 
            onOpenApp={openWindow}
          />
        )}
      </AnimatePresence>
      
      <div className="safe-zone">
        <AnimatePresence>
          {activeWindows.filter(w => !w.isMinimized).map(window => (
            <AppWindow 
              key={window.id} 
              title={window.title}
              onClose={() => closeWindow(window.id)}
              onMinimize={() => toggleMinimize(window.id)}
              hideBackButton={window.type === 'browser' || window.type === 'chat'}
              appIcon={WINDOW_METADATA[window.type]?.icon}
              brandColor={WINDOW_METADATA[window.type]?.color}
              defaultSize={
                window.type === 'calendar' ? { width: 1024, height: 720 } :
                window.type === 'browser' ? { width: 1100, height: 800 } :
                undefined
              }
            >
              <WindowContentRenderer window={window} windowConfigs={windowConfigs} closeWindow={closeWindow} />
              
              {window.type === 'settings' && (
                <SettingsRouter
                  activeSettingsView={activeSettingsView}
                  setActiveSettingsView={setActiveSettingsView}
                  wallpaper={wallpaper}
                  handleSetWallpaper={handleSetWallpaper}
                />
              )}
            </AppWindow>
          ))}
        </AnimatePresence>
      </div>

      <div style={{ position: 'fixed', bottom: '90px', right: '40px', display: 'flex', gap: '8px', zIndex: 'var(--z-navbar)' }}>
        <AnimatePresence>
          {activeWindows.filter(w => w.isMinimized).map(w => (
            <button 
              key={w.id} 
              onClick={() => toggleMinimize(w.id)}
              style={{ padding: '8px 16px', borderRadius: '12px', background: 'var(--schemes-primary-container)', color: 'var(--schemes-on-primary-container)', fontWeight: 500 }}
            >
              {w.title}
            </button>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeNavTab === 'apps' && (
          <AppsDrawer 
            onOpenApp={(type: WindowType, title: string) => { setActiveNavTab('home'); openWindow(type, title); }} 
            onClose={() => setActiveNavTab('home')} 
          />
        )}
        {activeNavTab === 'updates' && (
          <SettingsLayout activeSettingsTab="updates" onTabChange={(tab: string) => setActiveSettingsView(tab as SettingsRoute)}>
            <SystemUpdatesView />
          </SettingsLayout>
        )}
      </AnimatePresence>

      <XRNavigationBar activeTab={activeNavTab} onTabChange={(tab: string) => setActiveNavTab(tab as NavTabRoute)} />
    </DesktopEnvironment>
  );
};
