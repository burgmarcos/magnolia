import type { ReactNode } from 'react';
import { ArrowLeft, ChevronUp, Minus } from 'lucide-react';
import styles from './AppWindow.module.css';

interface AppWindowProps {
  title: string;
  children?: ReactNode;
}

export function AppWindow({ title, children }: AppWindowProps) {
  return (
    <div className={styles.appWindow}>
      {/* App Bar / Drag Area */}
      <div className={styles.appBar}>
        <div className={styles.controlsLeft}>
          <div className={styles.iconContainerBg}>
            <ArrowLeft size={24} color="var(--schemes-on-surface)" />
          </div>
          <ChevronUp size={24} color="var(--schemes-on-surface)" style={{ marginLeft: '16px' }} />
        </div>
        
        <div className={styles.titleContainer}>
          <p className={styles.titleText}>{title}</p>
        </div>
        
        <div className={styles.controlsRight}>
          <button className={styles.iconButtonError}>
            <Minus size={20} color="var(--schemes-on-surface)" />
          </button>
        </div>
      </div>
      
      {/* Window Body */}
      <div className={styles.body}>
        {children}
      </div>
    </div>
  );
}
