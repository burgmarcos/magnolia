import { useState, useEffect, Suspense, lazy, type ComponentType } from 'react';
import { extractThemeFromImage } from '../../utils/theme';
import { DesktopEnvironment } from '../layout/DesktopEnvironment';
import { XRAppBar } from '../layout/XRAppBar';
import { AppWindow } from '../AppWindow';
import { SettingsLayout } from '../layout/SettingsLayout';
import { XRNavigationBar } from '../layout/XRNavigationBar';
import { AppsDrawer } from '../layout/AppsDrawer';
import { NotificationsPanel } from '../layout/NotificationsPanel';
import { RegionalSettings } from './RegionalSettings';
import { GlobalSearchOverlay } from '../layout/GlobalSearchOverlay';
import { 
  Settings, MessageSquare, Info, CloudRain, CalendarDays, 
  Calculator, Globe, FolderOpen, FileText, Package, Clock, Music 
} from 'lucide-react';

import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindows } from '../../contexts/WindowContext';
import type { WindowType } from '../../contexts/WindowContext';

const ChatInterface = lazy(() => import('./ChatInterface').then(m => ({ default: m.ChatInterface })));
const AboutSystem = lazy(() => import('./AboutSystem').then(m => ({ default: m.AboutSystem })));
const WeatherApp = lazy(() => import('./WeatherApp.tsx').then(m => ({ default: m.WeatherApp })));
const CalendarApp = lazy(() => import('./CalendarApp.tsx').then(m => ({ default: m.CalendarApp })));
const CalculatorApp = lazy(() => import('./CalculatorApp.tsx').then(m => ({ default: m.CalculatorApp })));
const BrowserApp = lazy(() => import('./BrowserApp.tsx').then(m => ({ default: m.BrowserApp })));
const FileManagerApp = lazy(() => import('./FileManagerApp.tsx').then(m => ({ default: m.FileManagerApp })));
const FileEditor = lazy(() => import('./FileEditor.tsx').then(m => ({ default: m.FileEditor })));
const KnowledgeGraphView = lazy(() => import('./KnowledgeGraphView.tsx').then(m => ({ default: m.KnowledgeGraphView })));
const TelegramSettings = lazy(() => import('./TelegramSettings.tsx').then(m => ({ default: m.TelegramSettings })));
const PersonalizationSettings = lazy(() => import('./PersonalizationSettings.tsx').then(m => ({ default: m.PersonalizationSettings })));
const ModelsDownloader = lazy(() => import('./ModelsDownloader.tsx').then(m => ({ default: m.ModelsDownloader })));
const KnowledgeWorkspace = lazy(() => import('./KnowledgeWorkspace.tsx').then(m => ({ default: m.KnowledgeWorkspace })));
const SystemUpdatesView = lazy(() => import('./SystemUpdates.tsx').then(m => ({ default: m.SystemUpdates })));
const SecurityManagerView = lazy(() => import('./SecurityManager.tsx').then(m => ({ default: m.SecurityManager })));
const SystemDashboardHUD = lazy(() => import('./SystemDashboardHUD.tsx').then(m => ({ default: m.SystemDashboardHUD })));
const AppStore = lazy(() => import('./AppStore.tsx').then(m => ({ default: m.AppStore })));
const SystemPreferencesView = lazy(() => import('./SystemPreferences.tsx').then(m => ({ default: m.SystemPreferences })));
const ConnectivitySettingsView = lazy(() => import('./ConnectivitySettings.tsx').then(m => ({ default: m.ConnectivitySettings })));
const LifestyleSettingsView = lazy(() => import('./LifestyleSettings.tsx').then(m => ({ default: m.LifestyleSettings })));
const ClockApp = lazy(() => import('./ClockApp.tsx').then(m => ({ default: m.ClockApp })));
const MediaApp = lazy(() => import('./MediaApp.tsx').then(m => ({ default: m.MediaApp })));
const PDFReader = lazy(() => import('./PDFReader.tsx').then(m => ({ default: m.PDFReader })));
const PrivacyAuditView = lazy(() => import('./PrivacyAuditView.tsx').then(m => ({ default: m.PrivacyAuditView })));
const StorageSettingsView = lazy(() => import('./StorageSettings.tsx').then(m => ({ default: m.StorageSettings })));

type SettingsRoute = 'general' | 'models' | 'telegram' | 'knowledge' | 'graph' | 'search' | 'palette' | 'updates' | 'security' | 'preferences' | 'connectivity' | 'lifestyle' | 'regional' | 'privacy' | 'storage';
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
  const [wallpaper, setWallpaper] = useState<string | undefined>(undefined);
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

  useEffect(() => {
    const saved = localStorage.getItem('Magnolia-wallpaper');
    if (saved) {
      setWallpaper(saved);
    } else {
      setWallpaper('/wallpapers/vivid_nebula_4k_v006_no_text.png');
    }

    const savedPath = localStorage.getItem('Magnolia-knowledge-path');
    if (!savedPath) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke<string>('ensure_default_knowledge_dir')
          .then((path) => {
            console.log("Initialized default knowledge base at:", path);
            localStorage.setItem('Magnolia-knowledge-path', path);
            invoke('index_local_folder', { path }).then(() => invoke('trigger_embedding_job')).catch(console.error);
          })
          .catch(console.error);
      });
    }

    const gpuCheck = localStorage.getItem('Magnolia-gpu-checked');
    if (!gpuCheck) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke<{vendor: string, model: string, requires_proprietary: boolean}>('detect_gpu')
          .then((gpu) => {
            if (gpu.requires_proprietary) {
              toast.custom((t) => (
                <div style={{ background: 'var(--schemes-surface)', padding: '16px', borderRadius: '16px', boxShadow: 'var(--elevation-light-4)', border: '1px solid var(--schemes-outline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>🚀</span>
                    <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--schemes-primary)' }}>{gpu.vendor} Detected</h3>
                  </div>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--schemes-on-surface)' }}>Would you like to unlock maximum CUDA AI acceleration by safely downloading proprietary algorithms?</p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => toast.dismiss(t.id)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', color: 'var(--schemes-primary)', border: 'none', cursor: 'pointer' }}>Dismiss</button>
                    <button onClick={() => { toast.dismiss(t.id); toast.success('Initializing Driver Package...'); }} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--schemes-primary)', color: 'var(--schemes-on-primary)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Download Drivers</button>
                  </div>
                </div>
              ), { duration: Infinity });
            }
            localStorage.setItem('Magnolia-gpu-checked', 'true');
          })
          .catch(console.error);
      });
    }
  }, []);

  const handleSetWallpaper = (url: string) => {
    setWallpaper(url);
    localStorage.setItem('Magnolia-wallpaper', url);
  };

  useEffect(() => {
    const handleOpenApp = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, title, ...config } = customEvent.detail;
      openWindow(type, title, config);
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
        <div 
          onClick={() => setShowProfileMenu(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        >
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '72px',
              left: '24px',
              width: '240px',
              background: 'var(--schemes-surface-container)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '8px',
              boxShadow: 'var(--elevation-light-4)',
              border: '1px solid var(--schemes-outline-variant)',
              zIndex: 9999
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--schemes-outline-variant)' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--schemes-on-surface)' }}>Magnolia Admin</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--schemes-on-surface-variant)' }}>Magnolia Dashboard User</p>
            </div>
            <button 
              onClick={async () => {
                // Immediate Steel Persistence before logout
                import('@tauri-apps/api/core').then(async ({ invoke }) => {
                  try {
                    await invoke('save_session', { 
                      userId: 'default_user', 
                      state: { windows: activeWindows, configs: windowConfigs } 
                    });
                  } catch (e) {
                    console.error("Session archival failed during logout:", e);
                  }
                  onLogout?.();
                });
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '16px',
                color: 'var(--schemes-error)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                marginTop: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--schemes-error-container)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Logout & Exit
            </button>
          </motion.div>
        </div>
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
              <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--schemes-primary)' }}>Initializing App Layer...</div>}>
                {window.type === 'chat' && <ChatInterface />}
                {window.type === 'about' && <AboutSystem />}
                {window.type === 'weather' && <WeatherApp />}
                {window.type === 'calendar' && <CalendarApp />}
                {window.type === 'calculator' && <CalculatorApp />}
                {window.type === 'browser' && <BrowserApp initialUrl={windowConfigs[window.id]?.url as string | undefined} />}
                {window.type === 'files' && <FileManagerApp />}
                {window.type === 'appstore' && <AppStore />}
                {window.type === 'editor' && (
                  <FileEditor 
                    filename={(windowConfigs[window.id]?.filename as string) || 'untitled.md'}
                    content={(windowConfigs[window.id]?.content as string) || ''}
                    onSave={(newContent) => {
                      if (windowConfigs[window.id]?.path) {
                        import('@tauri-apps/api/core').then(({ invoke }) => {
                          invoke('write_text_file', { path: windowConfigs[window.id].path, content: newContent })
                            .then(() => toast.success('File saved'))
                            .catch(() => toast.error('Save failed'));
                        });
                      }
                    }}
                    onClose={() => closeWindow(window.id)}
                  />
                )}
                {window.type === 'clock' && <ClockApp />}
                {window.type === 'media' && <MediaApp />}
                {window.type === 'pdf' && (
                  <PDFReader 
                    url={windowConfigs[window.id]?.url as string} 
                    title={windowConfigs[window.id]?.title as string} 
                  />
                )}
              </Suspense>
              
              {window.type === 'settings' && (
                <SettingsLayout 
                  activeSettingsTab={activeSettingsView} 
                  onTabChange={(tab: string) => setActiveSettingsView(tab as SettingsRoute)}
                >
                  {activeSettingsView === 'general' && <SystemDashboardHUD />}
                  {activeSettingsView === 'palette' && <PersonalizationSettings onWallpaperChange={handleSetWallpaper} currentWallpaper={wallpaper} />}
                  {activeSettingsView === 'models' && <ModelsDownloader />}
                  {activeSettingsView === 'preferences' && <SystemPreferencesView />}
                  {activeSettingsView === 'connectivity' && <ConnectivitySettingsView />}
                  {activeSettingsView === 'lifestyle' && <LifestyleSettingsView />}
                  {activeSettingsView === 'regional' && <RegionalSettings />}
                  {activeSettingsView === 'privacy' && <PrivacyAuditView />}
                  {activeSettingsView === 'storage' && <StorageSettingsView />}
                  {activeSettingsView === 'knowledge' && <KnowledgeWorkspace />}
                  {activeSettingsView === 'graph' && <KnowledgeGraphView />}
                  {activeSettingsView === 'telegram' && <TelegramSettings />}
                  {activeSettingsView === 'updates' && <SystemUpdatesView />}
                  {activeSettingsView === 'security' && <SecurityManagerView />}
                </SettingsLayout>
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
            onOpenApp={(type: string, title: string) => { setActiveNavTab('home'); openWindow(type, title); }} 
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
