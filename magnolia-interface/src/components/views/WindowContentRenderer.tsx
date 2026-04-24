import { lazy, Suspense } from 'react';
import type { WindowInstance } from '../../contexts/WindowContext';
import { toast } from 'react-hot-toast';

const ChatInterface = lazy(() => import('./ChatInterface').then(m => ({ default: m.ChatInterface })));
const AboutSystem = lazy(() => import('./AboutSystem').then(m => ({ default: m.AboutSystem })));
const WeatherApp = lazy(() => import('./WeatherApp.tsx').then(m => ({ default: m.WeatherApp })));
const CalendarApp = lazy(() => import('./CalendarApp.tsx').then(m => ({ default: m.CalendarApp })));
const CalculatorApp = lazy(() => import('./CalculatorApp.tsx').then(m => ({ default: m.CalculatorApp })));
const BrowserApp = lazy(() => import('./BrowserApp.tsx').then(m => ({ default: m.BrowserApp })));
const FileManagerApp = lazy(() => import('./FileManagerApp.tsx').then(m => ({ default: m.FileManagerApp })));
const FileEditor = lazy(() => import('./FileEditor.tsx').then(m => ({ default: m.FileEditor })));
const AppStore = lazy(() => import('./AppStore.tsx').then(m => ({ default: m.AppStore })));
const ClockApp = lazy(() => import('./ClockApp.tsx').then(m => ({ default: m.ClockApp })));
const MediaApp = lazy(() => import('./MediaApp.tsx').then(m => ({ default: m.MediaApp })));
const PDFReader = lazy(() => import('./PDFReader.tsx').then(m => ({ default: m.PDFReader })));

interface WindowContentRendererProps {
  window: WindowInstance;
  windowConfigs: Record<string, Record<string, unknown>>;
  closeWindow: (id: string) => void;
}

export const WindowContentRenderer = ({ window, windowConfigs, closeWindow }: WindowContentRendererProps) => {
  return (
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
  );
};
