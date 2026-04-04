
import { User, Calendar } from 'lucide-react';
import styles from './XRAppBar.module.css';

export function XRAppBar() {
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={styles.appBar}>
      {/* Leading Icon / User */}
      <div className={styles.leadingIcon}>
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
        <button className={styles.iconButton} aria-label="Calendar">
          <Calendar size={24} color="var(--schemes-on-surface)" />
        </button>
      </div>
    </div>
  );
}
