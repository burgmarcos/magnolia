import { useState, useEffect } from 'react';
import { ChevronRight, Key, ShieldCheck } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import styles from './GeneralSettings.module.css';

interface GeneralSettingsProps {
  onNavigate: (route: 'models' | 'telegram' | 'general' | 'knowledge') => void;
  onWallpaperChange?: (url: string) => void;
  currentWallpaper?: string;
}

const WALLPAPERS = [
  { id: 'vibrant', name: 'Vibrant Abstract', url: '/src/assets/wallpapers/vibrant_abstract.png' },
  { id: 'soft', name: 'Soft Flow', url: '/src/assets/wallpapers/soft_flow.png' }
];

export function GeneralSettings({ onNavigate, onWallpaperChange, currentWallpaper }: GeneralSettingsProps) {
  const [hfToken, setHfToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    invoke<string>('get_api_key', { service: 'huggingface' })
      .then(setHfToken)
      .catch(() => console.log('HuggingFace token not found'));
  }, []);

  const saveHfToken = async () => {
    setIsSaving(true);
    try {
      await invoke('set_api_key', { service: 'huggingface', key: hfToken });
      toast.success('HuggingFace token saved successfully');
    } catch (e) {
      toast.error(`Failed to save token: ${String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>Settings</h2>
      
      {/* Wallpaper Gallery */}
      <div className={styles.cardList} style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--schemes-on-surface)', marginBottom: '12px' }}>Personalization</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          {WALLPAPERS.map(wp => (
            <div 
              key={wp.id}
              onClick={() => onWallpaperChange?.(wp.url)}
              style={{
                cursor: 'pointer',
                borderRadius: '16px',
                overflow: 'hidden',
                aspectRatio: '16/9',
                border: currentWallpaper === wp.url ? '3px solid var(--schemes-primary)' : '2px solid transparent',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <img src={wp.url} alt={wp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                padding: '8px', 
                background: 'rgba(0,0,0,0.5)', 
                color: 'white', 
                fontSize: '10px',
                backdropFilter: 'blur(4px)'
              }}>
                {wp.name}
              </div>
            </div>
          ))}
          <div 
            onClick={() => onWallpaperChange?.('')}
            style={{
              cursor: 'pointer',
              borderRadius: '16px',
              border: !currentWallpaper ? '3px solid var(--schemes-primary)' : '2px dashed var(--schemes-outline-variant)',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: 'var(--schemes-on-surface-variant)'
            }}
          >
            Clear
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className={styles.cardList}>
        <div className={styles.horizontalCard} style={{ cursor: 'default', height: 'auto', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Key size={20} color="var(--schemes-primary)" />
            <p className={styles.cardTitle}>Hugging Face API Token</p>
          </div>
          <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
            <input 
              type="password"
              className={styles.tokenInput}
              placeholder="hf_..."
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--schemes-outline-variant)', background: 'var(--schemes-surface-container-lowest)', color: 'var(--schemes-on-surface)', fontSize: '14px' }}
            />
            <button 
              onClick={saveHfToken}
              disabled={isSaving}
              style={{ padding: '0 16px', borderRadius: '12px', background: 'var(--schemes-primary)', border: 'none', color: 'var(--schemes-on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {isSaving ? '...' : <ShieldCheck size={20} />}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--schemes-on-surface-variant)', margin: 0 }}>Required to browse and download models from Hugging Face.</p>
        </div>
      </div>

      <div className={styles.cardList} style={{ marginTop: '24px' }}>
        <div 
          className={styles.horizontalCard} 
          onClick={() => onNavigate('models')}
          role="button"
          tabIndex={0}
        >
          <div className={styles.cardContent}>
            <p className={styles.cardTitle}>Models</p>
            <p className={styles.cardDescription}>Download and manage local open-source LLMs</p>
          </div>
          <div className={styles.cardMedia}>
            <ChevronRight color="var(--schemes-outline)" />
          </div>
        </div>
        
        <div 
          className={styles.horizontalCard}
          onClick={() => onNavigate('telegram')}
          role="button"
          tabIndex={0}
          style={{ marginTop: '12px' }}
        >
          <div className={styles.cardContent}>
            <p className={styles.cardTitle}>Telegram Integrations</p>
            <p className={styles.cardDescription}>Configure your Magnolia assistant to message via Telegram</p>
          </div>
          <div className={styles.cardMedia}>
            <ChevronRight color="var(--schemes-outline)" />
          </div>
        </div>

        <div 
          className={styles.horizontalCard}
          onClick={() => onNavigate('knowledge')}
          role="button"
          tabIndex={0}
          style={{ marginTop: '12px' }}
        >
          <div className={styles.cardContent}>
            <p className={styles.cardTitle}>Knowledge Base</p>
            <p className={styles.cardDescription}>Map a local folder to serve as the brain for RAG</p>
          </div>
          <div className={styles.cardMedia}>
            <ChevronRight color="var(--schemes-outline)" />
          </div>
        </div>
      </div>
    </div>
  );
}
