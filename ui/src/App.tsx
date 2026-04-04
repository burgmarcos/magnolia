import { useState } from 'react';
import { DesktopEnvironment } from './components/layout/DesktopEnvironment.tsx';
import { XRAppBar } from './components/layout/XRAppBar.tsx';
import { AppWindow } from './components/AppWindow.tsx';
import { SettingsLayout } from './components/layout/SettingsLayout.tsx';
import { GeneralSettings } from './components/views/GeneralSettings.tsx';
import { ModelsDownloader } from './components/views/ModelsDownloader.tsx';
import { ChatInterface } from './components/views/ChatInterface.tsx';
import { XRNavigationBar } from './components/layout/XRNavigationBar.tsx';
import { KnowledgeWorkspace } from './components/views/KnowledgeWorkspace.tsx';
import { KnowledgeGraphView } from './components/views/KnowledgeGraphView.tsx';

import { Toaster } from 'react-hot-toast';

type SettingsRoute = 'general' | 'models' | 'telegram' | 'knowledge';
type NavTabRoute = 'apps' | 'home' | 'updates' | 'graph';

function App() {
  const [apps] = useState([{ id: 1, title: 'Models & Settings' }]);
  const [activeSettingsView, setActiveSettingsView] = useState<SettingsRoute>('general');
  const [activeNavTab, setActiveNavTab] = useState<NavTabRoute>('home');

  return (
    <DesktopEnvironment>
      <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--schemes-surface-container-high, #ECE6F0)', color: 'var(--schemes-on-surface, #1D1B20)' } }} />
      <XRAppBar />
      
      {/* Primary Chat Window */}
      <AppWindow title="SLAI Assistant">
        <ChatInterface />
      </AppWindow>

      {/* Settings / Apps Windows */}
      {apps.map(app => (
        <AppWindow key={app.id} title={app.title}>
          <SettingsLayout activeSettingsTab={activeSettingsView}>
            {activeSettingsView === 'general' && (
              <GeneralSettings onNavigate={(route) => setActiveSettingsView(route)} />
            )}
            
            {activeSettingsView === 'models' && (
              <ModelsDownloader />
            )}

            {activeSettingsView === 'knowledge' && (
              <KnowledgeWorkspace />
            )}

            {activeSettingsView === 'telegram' && (
              <div style={{ padding: '16px' }}>
                <h2>Telegram Configuration</h2>
                <p>Coming soon...</p>
                <button 
                  onClick={() => setActiveSettingsView('general')}
                  style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--schemes-outline)' }}
                >
                  Back to General
                </button>
              </div>
            )}
          </SettingsLayout>
        </AppWindow>
      ))}

      {/* Graph View AppWindow Overlay */}
      {activeNavTab === 'graph' && (
        <AppWindow title="Knowledge Graph Exploration">
          <KnowledgeGraphView />
        </AppWindow>
      )}

      {/* Main Navigation */}
      <XRNavigationBar activeTab={activeNavTab} onTabChange={(tab) => setActiveNavTab(tab)} />
    </DesktopEnvironment>
  );
}

export default App;
