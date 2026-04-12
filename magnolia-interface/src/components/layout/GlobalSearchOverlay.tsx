import { useState, useEffect, useRef } from 'react';
import { Search, File, Folder, Rocket, X, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { usePreferences } from '../../context/PreferencesContext';

interface SearchResult {
  name: string;
  type: string;
  appType?: string;
  file_type?: string;
  path?: string;
}

interface GlobalSearchOverlayProps {
  onClose: () => void;
  onOpenApp: (type: string, title: string) => void;
}

export function GlobalSearchOverlay({ onClose, onOpenApp }: GlobalSearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const { indexingEnabled } = usePreferences();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      try {
        // 1. Search indexed files if enabled
        let fileResults: SearchResult[] = [];
        if (indexingEnabled) {
          fileResults = await invoke<SearchResult[]>('search_mempalace', { userId: 'default_user', query });
        }

        // 2. Search defined system apps (Mock logic for now)
        const apps = [
          { name: 'Settings', type: 'settings' },
          { name: 'Terminal', type: 'chat' },
          { name: 'Browser', type: 'browser' },
          { name: 'Files', type: 'files' },
          { name: 'Editor', type: 'editor' },
          { name: 'Clock', type: 'clock' },
        ];

        const appResults = apps
          .filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
          .map(a => ({ name: a.name, type: 'app', appType: a.type }));

        setResults([...appResults, ...fileResults]);
      } catch (e) {
        console.error("Search failed:", e);
      }
    };

    const timer = setTimeout(search, 150);
    return () => clearTimeout(timer);
  }, [query, indexingEnabled]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '100px'
      }}
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: -20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: -10, scale: 0.98 }}
        style={{
          width: '640px',
          background: 'var(--schemes-surface-container-high)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: 'var(--elevation-light-4)',
          border: '1px solid var(--schemes-outline-variant)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--schemes-outline-variant)' }}>
          <Search size={24} color="var(--schemes-primary)" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search files, apps, or settings..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '20px',
              color: 'var(--schemes-on-surface)',
              fontWeight: 500
            }}
          />
          <kbd style={{ padding: '4px 8px', background: 'var(--schemes-surface-container-highest)', color: 'var(--schemes-on-surface-variant)', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '12px' }}>
          {results.length > 0 ? (
            results.map((res, i) => (
              <div 
                key={i} 
                className="search-result-item"
                onClick={() => {
                  if (res.type === 'app') onOpenApp(res.appType || 'browser', res.name);
                  onClose();
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--schemes-surface-container-highest)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ padding: '10px', borderRadius: '12px', background: res.type === 'app' ? 'var(--schemes-primary-container)' : 'var(--schemes-secondary-container)' }}>
                  {res.type === 'app' ? <Rocket size={20} color="var(--schemes-primary)" /> : 
                   res.file_type === 'folder' ? <Folder size={20} color="var(--schemes-secondary)" /> : <File size={20} color="var(--schemes-secondary)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--schemes-on-surface)' }}>{res.name}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--schemes-on-surface-variant)' }}>{res.path || 'System Application'}</p>
                </div>
                {res.type === 'app' && <Zap size={16} color="var(--schemes-primary)" style={{ opacity: 0.6 }} />}
              </div>
            ))
          ) : query.length > 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--schemes-on-surface-variant)' }}>
               <X size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
               <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--schemes-on-surface-variant)' }}>
               <p style={{ fontSize: '13px' }}>Start typing to discover your sovereign palace...</p>
               {!indexingEnabled && (
                 <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '8px' }}>MemPalace file indexing is currently disabled. Enable it in Settings for deep file search.</p>
               )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
