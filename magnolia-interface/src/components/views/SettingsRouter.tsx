import { lazy } from 'react';
import { SettingsLayout } from '../layout/SettingsLayout';

const KnowledgeGraphView = lazy(() => import('./KnowledgeGraphView.tsx').then(m => ({ default: m.KnowledgeGraphView })));
const TelegramSettings = lazy(() => import('./TelegramSettings.tsx').then(m => ({ default: m.TelegramSettings })));
const PersonalizationSettings = lazy(() => import('./PersonalizationSettings.tsx').then(m => ({ default: m.PersonalizationSettings })));
const ModelsDownloader = lazy(() => import('./ModelsDownloader.tsx').then(m => ({ default: m.ModelsDownloader })));
const KnowledgeWorkspace = lazy(() => import('./KnowledgeWorkspace.tsx').then(m => ({ default: m.KnowledgeWorkspace })));
const SystemUpdatesView = lazy(() => import('./SystemUpdates.tsx').then(m => ({ default: m.SystemUpdates })));
const SecurityManagerView = lazy(() => import('./SecurityManager.tsx').then(m => ({ default: m.SecurityManager })));
const SystemDashboardHUD = lazy(() => import('./SystemDashboardHUD.tsx').then(m => ({ default: m.SystemDashboardHUD })));
const SystemPreferencesView = lazy(() => import('./SystemPreferences.tsx').then(m => ({ default: m.SystemPreferences })));
const ConnectivitySettingsView = lazy(() => import('./ConnectivitySettings.tsx').then(m => ({ default: m.ConnectivitySettings })));
const LifestyleSettingsView = lazy(() => import('./LifestyleSettings.tsx').then(m => ({ default: m.LifestyleSettings })));
const PrivacyAuditView = lazy(() => import('./PrivacyAuditView.tsx').then(m => ({ default: m.PrivacyAuditView })));
const StorageSettingsView = lazy(() => import('./StorageSettings.tsx').then(m => ({ default: m.StorageSettings })));
const RegionalSettings = lazy(() => import('./RegionalSettings.tsx').then(m => ({ default: m.RegionalSettings })));

export type SettingsRoute = 'general' | 'models' | 'telegram' | 'knowledge' | 'graph' | 'search' | 'palette' | 'updates' | 'security' | 'preferences' | 'connectivity' | 'lifestyle' | 'regional' | 'privacy' | 'storage';

interface SettingsRouterProps {
  activeSettingsView: SettingsRoute;
  setActiveSettingsView: (view: SettingsRoute) => void;
  wallpaper?: string;
  handleSetWallpaper: (url: string) => void;
}

export const SettingsRouter = ({ activeSettingsView, setActiveSettingsView, wallpaper, handleSetWallpaper }: SettingsRouterProps) => {
  return (
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
  );
};
