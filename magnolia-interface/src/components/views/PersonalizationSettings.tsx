import { Palette, Image as ImageIcon, Sparkles, Box } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import styles from './GeneralSettings.module.css';

interface PersonalizationSettingsProps {
  onWallpaperChange: (url: string) => void;
  currentWallpaper?: string;
}

const WALLPAPERS = [
  { id: 'vibrant', name: 'Vibrant Abstract', url: '/wallpapers/vibrant_abstract.png' },
  { id: 'soft', name: 'Soft Flow', url: '/wallpapers/soft_flow.png' },
  { id: 'glass', name: 'Glass Patterns', url: '/wallpapers/glass_patterns.png' }
];

export function PersonalizationSettings({ onWallpaperChange, currentWallpaper }: PersonalizationSettingsProps) {
  const { matchIconsToTheme, setMatchIconsToTheme } = usePreferences();

  return (
    <div className={styles.container} style={{ padding: '24px', overflowY: 'auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>Personalization</h1>
        <p style={{ color: 'var(--schemes-on-surface-variant)', fontSize: '13px' }}>Customize your workspace aesthetics</p>
      </header>

      <div className={styles.cardList}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <ImageIcon size={20} color="var(--schemes-primary)" />
          <p className={styles.header} style={{ margin: 0, paddingLeft: 0 }}>Wallpaper Gallery</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {WALLPAPERS.map(wp => (
            <div 
              key={wp.id}
              onClick={() => onWallpaperChange(wp.url)}
              style={{
                cursor: 'pointer',
                borderRadius: '16px',
                overflow: 'hidden',
                aspectRatio: '16/9',
                border: currentWallpaper === wp.url ? '4px solid var(--schemes-primary)' : '1px solid var(--schemes-outline-variant)',
                position: 'relative',
                transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                boxShadow: currentWallpaper === wp.url ? 'var(--elevation-light-2)' : 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img src={wp.url} alt={wp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                padding: '8px 12px', 
                background: 'rgba(0,0,0,0.4)', 
                color: 'white', 
                fontSize: '11px', 
                fontWeight: 600, 
                backdropFilter: 'blur(8px)' 
              }}>
                {wp.name}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Palette size={20} color="var(--schemes-primary)" />
          <p className={styles.header} style={{ margin: 0, paddingLeft: 0 }}>System Accent</p>
        </div>

        <div className={styles.horizontalCard} style={{ height: 'auto', padding: '20px', gap: '16px' }}>
          <Sparkles size={24} color="var(--schemes-primary)" />
          <div style={{ flex: 1 }}>
            <p className={styles.cardTitle}>Dynamic Color Sync</p>
            <p className={styles.cardDescription}>Automatically match UI accents to the current wallpaper palette</p>
          </div>
          <div style={{ width: '40px', height: '24px', borderRadius: '12px', background: 'var(--schemes-primary)', cursor: 'not-allowed', opacity: 0.8 }} />
        </div>

        <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Box size={20} color="var(--schemes-primary)" />
          <p className={styles.header} style={{ margin: 0, paddingLeft: 0 }}>Application Assets</p>
        </div>

        <div 
          className={styles.horizontalCard} 
          style={{ height: 'auto', padding: '20px', gap: '16px', cursor: 'pointer' }}
          onClick={() => setMatchIconsToTheme(!matchIconsToTheme)}
        >
          <div style={{ padding: '10px', borderRadius: '12px', background: matchIconsToTheme ? 'var(--schemes-primary-container)' : 'var(--schemes-surface-container-highest)' }}>
            <Sparkles size={24} color={matchIconsToTheme ? 'var(--schemes-primary)' : 'var(--schemes-on-surface-variant)'} />
          </div>
          <div style={{ flex: 1 }}>
            <p className={styles.cardTitle}>Thematic App Icons</p>
            <p className={styles.cardDescription}>Force third-party and system app icons to adapt to the current accent color</p>
          </div>
          <div style={{ 
            width: '40px', 
            height: '24px', 
            borderRadius: '12px', 
            background: matchIconsToTheme ? 'var(--schemes-primary)' : 'var(--schemes-outline)', 
            position: 'relative',
            transition: 'background 0.3s'
          }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              background: 'white', 
              borderRadius: '50%', 
              position: 'absolute', 
              top: '4px',
              left: matchIconsToTheme ? '20px' : '4px',
              transition: 'left 0.3s'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
