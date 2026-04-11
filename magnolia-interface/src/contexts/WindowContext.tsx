/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type WindowType = 'settings' | 'chat' | 'about' | 'weather' | 'calendar' | 'calculator' | 'browser' | 'files' | 'editor' | 'appstore' | 'clock' | 'media' | 'pdf';

export interface WindowInstance {
  id: string;
  title: string;
  type: WindowType;
  isMinimized?: boolean;
}

interface WindowContextType {
  activeWindows: WindowInstance[];
  windowConfigs: Record<string, Record<string, unknown>>;
  openWindow: (type: WindowType, title: string, config?: Record<string, unknown>) => void;
  closeWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

export const WindowProvider = ({ children }: { children: ReactNode }) => {
  const [activeWindows, setActiveWindows] = useState<WindowInstance[]>([]);
  const [windowConfigs, setWindowConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    invoke<{ windows: WindowInstance[], configs: Record<string, Record<string, unknown>> }>('load_session', { userId: 'default_user' })
      .then(res => {
        if (res) {
          setActiveWindows(res.windows);
          setWindowConfigs(res.configs);
        } else {
          // Fallback to initial state if no session exists
          setActiveWindows([{ id: 'chat-main', title: 'Assistant', type: 'chat' }]);
        }
        setIsHydrated(true);
      })
      .catch((e) => {
        console.error("Failed to load session:", e);
        setActiveWindows([{ id: 'chat-main', title: 'Assistant', type: 'chat' }]);
        setIsHydrated(true);
      });
  }, []);

  // 2. Debounced Persistence to disk
  useEffect(() => {
    if (!isHydrated) return;

    const timer = setTimeout(() => {
      invoke('save_session', { 
        userId: 'default_user', 
        state: { windows: activeWindows, configs: windowConfigs } 
      }).catch(console.error);
    }, 2000);

    return () => clearTimeout(timer);
  }, [activeWindows, windowConfigs, isHydrated]);

  const openWindow = useCallback((type: WindowType, title: string, config?: Record<string, unknown>) => {
    setActiveWindows(prev => {
      const existingIndex = prev.findIndex(w => w.type === type);
      
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const updated = [...prev];
        updated.splice(existingIndex, 1);
        updated.push({ ...existing, isMinimized: false });
        
        return updated;
      }

      let id = `${type}-${Date.now()}`;
      if (type === 'calendar') {
        id = 'calendar-main';
      }

      if (config) {
        setWindowConfigs(c => ({ ...c, [id]: config }));
      }
      
      // LOG EVENT: Gain focus
      invoke('log_usage_event', { appId: title, eventType: 'gain_focus' }).catch(console.error);

      return [...prev, { id, title, type }];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setActiveWindows(prev => {
      const closing = prev.find(w => w.id === id);
      if (closing) {
        invoke('log_usage_event', { appId: closing.title, eventType: 'lose_focus' }).catch(console.error);
      }
      return prev.filter(w => w.id !== id);
    });
    setWindowConfigs(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setActiveWindows(prev => prev.map(w => 
      w.id === id ? { ...w, isMinimized: !w.isMinimized } : w
    ));
  }, []);

  return (
    <WindowContext.Provider value={{
      activeWindows,
      windowConfigs,
      openWindow,
      closeWindow,
      toggleMinimize
    }}>
      {children}
    </WindowContext.Provider>
  );
};

export const useWindows = () => {
  const context = useContext(WindowContext);
  if (!context) {
    throw new Error('useWindows must be used within a WindowProvider');
  }
  return context;
};
