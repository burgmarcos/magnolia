import { User, Search } from 'lucide-react';
import { PrivacyDots } from '../widgets/PrivacyDots';
import styles from './XRAppBar.module.css';

interface XRAppBarProps {
  onOpenSearch?: () => void;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
}

export function XRAppBar({ onOpenSearch, onOpenProfile, onOpenNotifications }: XRAppBarProps) {
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={styles.appBar} data-tauri-drag-region>
      {/* Leading Icon / User */}
      <div className={styles.leadingIcon} onClick={onOpenProfile} style={{ cursor: 'pointer' }}>
        <div className={styles.userAvatar}>
          <User size={24} color="var(--schemes-on-surface)" />
        </div>
      </div>

      {/* Center Text */}
      <div className={styles.textContent}>
        <p className={styles.headline}>{currentTime}</p>
      </div>

      {/* Trailing Elements */}
      <div className={styles.trailingElements}>
        <PrivacyDots />
        <button className={styles.iconButton} aria-label="Notifications" onClick={onOpenNotifications}>
           <Search size={22} color="var(--schemes-on-surface)" />
        </button>
        <button className={styles.iconButton} aria-label="Search" onClick={onOpenSearch}>
          <User size={22} color="var(--schemes-on-surface)" />
        </button>
      </div>
    </div>
  );
}
