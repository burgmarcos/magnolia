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
  const [activeWindowsMap, setActiveWindowsMap] = useState<Map<WindowType, WindowInstance>>(new Map());
  const [windowConfigs, setWindowConfigs] = useState<Record<string, Record<string, unknown>>>({});

  const activeWindows = Array.from(activeWindowsMap.values());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    invoke<{ windows: WindowInstance[], configs: Record<string, Record<string, unknown>> }>('load_session', { userId: 'default_user' })
      .then(res => {
        if (res) {
          setActiveWindowsMap(new Map(res.windows.map(w => [w.type, w])));
          setWindowConfigs(res.configs);
        } else {
          // Fallback to initial state if no session exists
          setActiveWindowsMap(new Map([['chat', { id: 'chat-main', title: 'Assistant', type: 'chat' }]]));
        }
        setIsHydrated(true);
      })
      .catch((e) => {
        console.error("Failed to load session:", e);
        setActiveWindowsMap(new Map([['chat', { id: 'chat-main', title: 'Assistant', type: 'chat' }]]));
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
    setActiveWindowsMap(prev => {
      const next = new Map(prev);
      const existing = next.get(type);
      
      if (existing) {
        next.delete(type); // Removing and re-adding brings it to the end of insertion order (highest z-index)
        next.set(type, { ...existing, isMinimized: false });
        return next;
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

      next.set(type, { id, title, type });
      return next;
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setActiveWindowsMap(prev => {
      // Find the window type by ID
      let closingType: WindowType | undefined;
      for (const [type, w] of prev.entries()) {
        if (w.id === id) {
          closingType = type;
          invoke('log_usage_event', { appId: w.title, eventType: 'lose_focus' }).catch(console.error);
          break;
        }
      }

      if (closingType) {
        const next = new Map(prev);
        next.delete(closingType);
        return next;
      }
      return prev;
    });
    setWindowConfigs(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setActiveWindowsMap(prev => {
      let targetType: WindowType | undefined;
      let targetWindow: WindowInstance | undefined;

      for (const [type, w] of prev.entries()) {
        if (w.id === id) {
          targetType = type;
          targetWindow = w;
          break;
        }
      }

      if (targetType && targetWindow) {
        const next = new Map(prev);
        next.set(targetType, { ...targetWindow, isMinimized: !targetWindow.isMinimized });
        return next;
      }
      return prev;
    });
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
