import type { ReactNode } from 'react';
import { Search, LayoutTemplate, Image as ImageIcon, Music, PlaySquare, FileText, Gamepad2 } from 'lucide-react';
import styles from './SettingsLayout.module.css';

interface SettingsLayoutProps {
  children: ReactNode;
  activeSettingsTab?: 'general' | 'models' | 'search' | 'telegram' | 'knowledge'; // Expansion later
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className={styles.layoutContainer}>
      {/* Left Navigation Rail */}
      <nav className={styles.navRail}>
        <div className={styles.navItemActive}>
          <Search size={22} color="var(--schemes-on-surface)" />
        </div>
        <div className={styles.navItem}>
          <LayoutTemplate size={22} color="var(--schemes-on-surface)" />
        </div>
        <div className={styles.navItem}>
          <ImageIcon size={22} color="var(--schemes-on-surface)" />
        </div>
        <div className={styles.navItem}>
          <Music size={22} color="var(--schemes-on-surface)" />
        </div>
        <div className={styles.navItem}>
          <PlaySquare size={22} color="var(--schemes-on-surface)" />
        </div>
        <div className={styles.navItem}>
          <FileText size={22} color="var(--schemes-on-surface)" />
        </div>
        <div className={styles.navItem}>
          <Gamepad2 size={22} color="var(--schemes-on-surface)" />
        </div>
      </nav>

      {/* Right Content Pane */}
      <main className={styles.contentPane}>
        {children}
      </main>
    </div>
  );
}
