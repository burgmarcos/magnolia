import type { ReactNode } from 'react';
import styles from './DesktopEnvironment.module.css';

interface DesktopEnvironmentProps {
  children: ReactNode;
}

export function DesktopEnvironment({ children }: DesktopEnvironmentProps) {
  return (
    <div className={styles.desktop}>
      <div className={styles.background}>
        <div className={styles.gradientOverlay} />
      </div>
      
      {children}
      
      {/* Bottom Navigation Handle */}
      <div className={styles.navigationHandleContainer}>
        <div className={styles.navigationHandle} />
      </div>
    </div>
  );
}
