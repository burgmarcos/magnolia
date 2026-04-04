import { Grid, Home, Bell, Network } from 'lucide-react';
import styles from './XRNavigationBar.module.css';

interface XRNavigationBarProps {
  activeTab?: 'apps' | 'home' | 'updates' | 'graph';
  onTabChange?: (tab: 'apps' | 'home' | 'updates' | 'graph') => void;
}

export function XRNavigationBar({ activeTab = 'home', onTabChange }: XRNavigationBarProps) {
  const handleTabClick = (tab: 'apps' | 'home' | 'updates' | 'graph') => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className={styles.container}>
      <div 
        className={`${styles.navItem} ${activeTab === 'apps' ? styles.navItemActive : ''}`}
        onClick={() => handleTabClick('apps')}
      >
        <div className={`${styles.iconContainer} ${activeTab === 'apps' ? styles.iconContainerActive : ''}`}>
          <Grid size={24} color={activeTab === 'apps' ? "var(--schemes-on-surface)" : "var(--schemes-on-surface-variant)"} />
        </div>
        <p>Apps</p>
      </div>

      <div 
        className={`${styles.navItem} ${activeTab === 'home' ? styles.navItemActive : ''}`}
        onClick={() => handleTabClick('home')}
      >
        <div className={`${styles.iconContainer} ${activeTab === 'home' ? styles.iconContainerActive : ''}`}>
          <Home size={24} color={activeTab === 'home' ? "var(--schemes-on-surface)" : "var(--schemes-on-surface-variant)"} />
        </div>
        <p>Home</p>
      </div>

      <div 
        className={`${styles.navItem} ${activeTab === 'graph' ? styles.navItemActive : ''}`}
        onClick={() => handleTabClick('graph')}
      >
        <div className={`${styles.iconContainer} ${activeTab === 'graph' ? styles.iconContainerActive : ''}`}>
          <Network size={24} color={activeTab === 'graph' ? "var(--schemes-on-surface)" : "var(--schemes-on-surface-variant)"} />
        </div>
        <p>Graph</p>
      </div>

      <div 
        className={`${styles.navItem} ${activeTab === 'updates' ? styles.navItemActive : ''}`}
        onClick={() => handleTabClick('updates')}
      >
        <div className={`${styles.iconContainer} ${activeTab === 'updates' ? styles.iconContainerActive : ''}`}>
          <Bell size={24} color={activeTab === 'updates' ? "var(--schemes-on-surface)" : "var(--schemes-on-surface-variant)"} />
        </div>
        <p>Updates</p>
      </div>
    </div>
  );
}
