import { type ReactNode } from 'react';
import { Search, LayoutTemplate, Music, PlaySquare, FileText, Gamepad2, Network, Send, Palette, RefreshCw, Shield, Globe, ShieldCheck, HardDrive } from 'lucide-react';
import styles from './SettingsLayout.module.css';

interface SettingsLayoutProps {
  children: ReactNode;
  activeSettingsTab?: 'general' | 'models' | 'search' | 'telegram' | 'knowledge' | 'graph' | 'palette' | 'updates' | 'security' | 'regional' | 'preferences' | 'connectivity' | 'lifestyle' | 'privacy' | 'storage';
  onTabChange?: (tab: 'general' | 'models' | 'search' | 'telegram' | 'knowledge' | 'graph' | 'palette' | 'updates' | 'security' | 'regional' | 'preferences' | 'connectivity' | 'lifestyle' | 'privacy' | 'storage') => void;
}

export function SettingsLayout({ children, activeSettingsTab, onTabChange }: SettingsLayoutProps) {
  const handleTabClick = (tab: 'general' | 'models' | 'search' | 'telegram' | 'knowledge' | 'graph' | 'palette' | 'updates' | 'security' | 'regional' | 'preferences' | 'connectivity' | 'lifestyle' | 'privacy' | 'storage') => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className={styles.layoutContainer}>
      {/* Left Navigation Rail */}
      <nav className={styles.navRail}>
        <div 
          className={activeSettingsTab === 'general' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('general')}
          title="General Settings"
        >
          <LayoutTemplate size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'models' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('models')}
          title="Models"
        >
          <Search size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'knowledge' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('knowledge')}
          title="Knowledge Base"
        >
          <FileText size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'graph' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('graph')}
          title="Knowledge Graph"
        >
          <Network size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'telegram' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('telegram')}
          title="Integrations (Telegram)"
        >
          <Send size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'regional' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('regional')}
          title="Regional & Units"
        >
          <Globe size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'palette' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('palette')}
          title="Personalization"
        >
          <Palette size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'updates' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('updates')}
          title="OS Updates"
        >
          <RefreshCw size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'security' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('security')}
          title="Security & Partitions"
        >
          <Shield size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'privacy' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('privacy')}
          title="Privacy Audit History"
        >
          <ShieldCheck size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div 
          className={activeSettingsTab === 'storage' ? styles.navItemActive : styles.navItem}
          onClick={() => handleTabClick('storage')}
          title="Physical Storage"
        >
          <HardDrive size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div className={styles.navItem} title="Music (Coming Soon)">
          <Music size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div className={styles.navItem} title="Media (Coming Soon)">
          <PlaySquare size={22} color="var(--schemes-on-surface-variant)" />
        </div>
        <div className={styles.navItem} title="Games (Coming Soon)">
          <Gamepad2 size={22} color="var(--schemes-on-surface-variant)" />
        </div>
      </nav>

      {/* Right Content Pane */}
      <main className={styles.contentPane}>
        {children}
      </main>
    </div>
  );
}
