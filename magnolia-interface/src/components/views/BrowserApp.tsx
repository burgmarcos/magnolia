import { useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Shield, Globe, Lock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface BrowserProps {
  initialUrl?: string;
}

export function BrowserApp({ initialUrl }: BrowserProps) {
  const [url, setUrl] = useState(initialUrl || 'about:blank');
  const [inputValue, setInputValue] = useState(url === 'about:blank' ? '' : url);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>(initialUrl ? [initialUrl] : []);
  const [historyIndex, setHistoryIndex] = useState(initialUrl ? 0 : -1);
  const [searchEngine, setSearchEngine] = useState(() => localStorage.getItem('Magnolia-search-engine'));
  // Use internal iframe instead of floating native window to respect OS layering
  const navigate = (targetUrl?: string) => {
    let target = targetUrl || inputValue;
    if (!target.includes('.') && !target.startsWith('http')) {
      const engineUrl = searchEngine === 'google' ? 'https://www.google.com/search?q=' :
                       searchEngine === 'bing' ? 'https://www.bing.com/search?q=' :
                       'https://duckduckgo.com/?q=';
      target = engineUrl + encodeURIComponent(target);
    } else if (!target.startsWith('http')) {
      target = 'https://' + target;
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(target);
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setUrl(target);
    setInputValue(target);
    setIsLoading(true);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setUrl(history[prevIndex]);
      setInputValue(history[prevIndex]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setUrl(history[nextIndex]);
      setInputValue(history[nextIndex]);
    }
  };

  const reload = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--schemes-surface-container-lowest)', position: 'relative' }}>
      {/* Search Engine Selector */}
      <AnimatePresence>
        {!searchEngine && !initialUrl && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'var(--schemes-surface-container-lowest)', 
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center'
            }}
          >
            <div style={{ maxWidth: '480px', marginBottom: '40px' }}>
              <div style={{ display: 'inline-flex', padding: '20px', borderRadius: '24px', background: 'var(--schemes-primary-container)', marginBottom: '24px' }}>
                <Globe size={48} color="var(--schemes-on-primary-container)" />
              </div>
              <h1 style={{ marginBottom: '12px', color: 'var(--schemes-on-surface)', fontSize: '28px', fontWeight: 600 }}>Choose your experience</h1>
              <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '15px', lineHeight: '1.6' }}>
                In compliance with EU regulations, please select your preferred default search engine.
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', width: '100%', maxWidth: '600px' }}>
              {[
                { name: 'Google', id: 'google' },
                { name: 'DuckDuckGo', id: 'duckduckgo' },
                { name: 'Bing', id: 'bing' }
              ].map(engine => (
                <button 
                  key={engine.id}
                  onClick={() => {
                    localStorage.setItem('Magnolia-search-engine', engine.id);
                    setSearchEngine(engine.id);
                  }}
                  style={{
                    padding: '24px',
                    borderRadius: '24px',
                    background: 'var(--schemes-surface-container-high)',
                    border: '1px solid var(--schemes-outline-variant)',
                    cursor: 'pointer',
                    color: 'var(--schemes-on-surface)',
                    fontWeight: 600,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <span style={{ opacity: 0.8 }}>Search with</span>
                  {engine.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div style={{ 
        padding: '12px 16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        background: 'var(--schemes-surface-container)',
        borderBottom: '1px solid var(--schemes-outline-variant)',
        backdropFilter: 'blur(10px)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...toolbarBtn, opacity: historyIndex > 0 ? 1 : 0.3 }} onClick={goBack} disabled={historyIndex <= 0}><ArrowLeft size={18} /></button>
          <button style={{ ...toolbarBtn, opacity: historyIndex < history.length - 1 ? 1 : 0.3 }} onClick={goForward} disabled={historyIndex >= history.length - 1}><ArrowRight size={18} /></button>
          <button style={toolbarBtn} title="Open in System Browser" onClick={() => invoke('open_external_url', { url })}><Globe size={18} color="var(--schemes-primary)" /></button>
          <button style={toolbarBtn} onClick={reload}><RotateCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
          <button style={toolbarBtn} onClick={() => {setUrl('about:blank'); setInputValue(''); setHistory([]); setHistoryIndex(-1);}}><Home size={18} /></button>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--schemes-surface-container-low)', borderRadius: '12px', padding: '8px 16px', gap: '12px', border: '1px solid var(--schemes-outline-variant)' }}>
          {url.startsWith('https') ? <Lock size={14} color="#4CAF50" /> : <Globe size={14} />}
          <input 
            type="text" 
            placeholder="Search or enter URL"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate()}
            style={{ background: 'transparent', border: 'none', flex: 1, color: 'var(--schemes-on-surface)', fontSize: '13px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--schemes-primary)' }}>
          <Shield size={20} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>SOVEREIGN WEBVIEW</span>
        </div>
      </div>

      {/* Viewport */}
      <div style={{ flex: 1, position: 'relative', background: url === 'about:blank' ? 'var(--schemes-surface-container-lowest)' : 'white' }}>
        {url === 'about:blank' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--schemes-on-surface-variant)' }}>
            <div style={{ textAlign: 'center', opacity: 0.5 }}>
              <Globe size={64} style={{ marginBottom: '24px', margin: '0 auto' }} />
              <p>Enter a URL to access the Sovereign Webview</p>
            </div>
          </div>
        )}
        
        {url !== 'about:blank' && (
          <>
            <iframe 
              src={url} 
              onLoad={() => setIsLoading(false)}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Sovereign Browser Content"
            />
            <div style={{ position: 'absolute', bottom: 16, right: 16, background: 'var(--schemes-surface-container-high)', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 300 }}>
               <AlertCircle size={20} color="var(--schemes-primary)" style={{ flexShrink: 0 }} />
               <p style={{ fontSize: 12, margin: 0, color: 'var(--schemes-on-surface-variant)' }}>If a website (like HuggingFace) refuses to connect, it blocks embedding. Please use the Models Hub app, or open in external OS browser.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const toolbarBtn: CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '8px',
  borderRadius: '8px',
  cursor: 'pointer',
  color: 'var(--schemes-on-surface-variant)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s'
};
