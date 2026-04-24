/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, Suspense, lazy } from 'react';
import { WindowProvider } from './contexts/WindowContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { MainDesktop } from './components/views/MainDesktop';
import { BootScreen } from './components/Boot/BootScreen';
import { Lockscreen } from './components/Lockscreen/Lockscreen';

// Lazy load mode-specific flows
const MagnoliaInstallerFlow = lazy(() => import('./components/views/MagnoliaInstallerFlow').then(m => ({ default: m.SovereignInstallerFlow })));
const MagnoliaUninstallFlow = lazy(() => import('./components/views/MagnoliaUninstallFlow').then(m => ({ default: m.SovereignUninstallFlow })));
const SovereignOOBE = lazy(() => import('./components/views/SovereignOOBE').then(m => ({ default: m.SovereignOOBE })));

export default function App() {
  const [mode, setMode] = useState<'boot' | 'lock' | 'main' | 'installer' | 'uninstaller' | 'oobe'>('boot');

  useEffect(() => {
    // Check launch mode from Tauri backend
    import('@tauri-apps/api/core').then(async ({ invoke }) => {
      try {
        const launchMode = await invoke<string>('get_launch_mode');
        
        let targetMode: 'boot' | 'lock' | 'main' | 'installer' | 'uninstaller' | 'oobe' = launchMode as any;

        if (launchMode === 'main') {
          // Extra check: Do we have an identity?
          const hasIdentity = await invoke<boolean>('check_identity_exists');
          if (!hasIdentity) {
            targetMode = 'oobe';
          } else {
            // If identity exists, show lockscreen first
            targetMode = 'lock';
          }
        }
        
        // Boot for at least 3 seconds to show off the UI
        setTimeout(() => setMode(targetMode), 3500);
      } catch (e) {
        console.error('Failed to initialize Magnolia:', e);
        // Fallback for dev: Boot -> Lock
        setTimeout(() => setMode('lock'), 3500);
      }
    });
  }, []);

  if (mode === 'boot') {
    return <BootScreen />;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <PreferencesProvider>
          <Suspense fallback={<BootScreen />}>
            {mode === 'lock' && <Lockscreen onLogin={() => setMode('main')} />}
            {mode === 'installer' && <MagnoliaInstallerFlow />}
            {mode === 'uninstaller' && <MagnoliaUninstallFlow />}
            {mode === 'oobe' && <SovereignOOBE onComplete={() => setMode('main')} />}
            {mode === 'main' && (
              <WindowProvider>
                <MainDesktop onLogout={() => setMode('lock')} />
              </WindowProvider>
            )}
          </Suspense>
        </PreferencesProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
